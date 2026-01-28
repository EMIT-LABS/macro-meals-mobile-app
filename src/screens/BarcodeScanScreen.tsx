import Ionicons from '@expo/vector-icons/Ionicons';
import { useMixpanel } from '@macro-meals/mixpanel/src';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { scanService } from '../services/scanService';

type RootStackParamList = {
  Dashboard: undefined;
  Stats: undefined;
  AddMeal: { barcodeData: string; analyzedData?: any,  };
  AddMealScreen: { barcodeData?: string; analyzedData?: any, defaultDate?:string };
  MealList: undefined;
  Profile: undefined;
};
interface RouteParams{
    defaultDate?: string;

}

type NavigationProp = StackNavigationProp<RootStackParamList>;
const BarcodeScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ BarcodeScanScreen: RouteParams }, 'BarcodeScanScreen'>>();
  const params = route.params || {};
  const { defaultDate } = params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanInterval = 2500;
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  const lastBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const [scanError, setScanError] = useState(false);
  const mixpanel = useMixpanel();

  useEffect(() => {
    mixpanel?.track({
      name: 'barcode_scan_opened',
      properties: {
        entry_point: 'add_meal',
      },
    });
    navigation.addListener('focus', () => {
      resetScanState();
    });
    return () => {
      cleanupScanState();
    };
  }, [navigation]);

  const resetScanState = () => {
    setIsProcessing(false);
    setIsAlertVisible(false);
    processingRef.current = false;
    lastBarcodeRef.current = null;
    lastScanTimeRef.current = 0;
    cleanupScanState();
  };

  const cleanupScanState = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const handleBarCodeScanned = async (scanningResult: { data: string }) => {
    const currentTime = Date.now();
    if (
      processingRef.current ||
      isAlertVisible ||
      (lastBarcodeRef.current === scanningResult.data &&
        currentTime - lastScanTimeRef.current < scanInterval)
    ) {
      console.log('BARCODE ALREADY SCANNED', scanningResult.data);
      return;
    }

    // Validate barcode format
    const barcode = scanningResult.data.trim();
    if (!barcode || barcode.length < 8) {
      console.log('Invalid barcode format:', barcode);
      return;
    }

    processingRef.current = true;
    console.log('BARCODE SCANNED', barcode);
    lastBarcodeRef.current = barcode;
    lastScanTimeRef.current = currentTime;
    setIsProcessing(true);

    try {
      const response = await scanService.scanBarcode(barcode);
      if (!response.success) {
        setScanError(true);
        handleScanError(barcode);
        return;
      }

      const product = response.data.items[0];
      if (product) {
        mixpanel?.track({
          name: 'barcode_scanned',
          properties: {
            barcode_value: barcode,
            match_found: true,
          },
        });
        setScanError(false);
        console.log('product', product);
        handleSuccessfulScan(barcode, product);
      } else {
        setScanError(true);
        handleScanError(barcode);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      setScanError(true);
      handleScanError(barcode);
    } finally {
      processingRef.current = false;
    }
  };

  const handleScanError = (barcodeData: string) => {
    mixpanel?.track({
      name: 'barcode_unrecognized_prompt_manual',
      properties: {
        barcode_value: barcodeData,
      },
    });
    if (isAlertVisible) return;
    setIsAlertVisible(true);
    Alert.alert(
      'Product Not Found',
      "We couldn't find this product in our database. Would you like to add it manually?",
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            resetScanState();
          },
        },
        {
          text: 'Add Manually',
          onPress: () => {
            setIsAlertVisible(false);
            navigation.navigate('AddMealScreen', { barcodeData });
          },
        },
      ]
    );
  };

  const handleSuccessfulScan = (barcodeData: string, product: any,) => {
    mixpanel?.track({
      name: 'prefilled_form_shown_from_barcode',
      properties: {
        barcode_value: barcodeData,
        meal_name: product.name,
        meal_type: product.meal_type,
        calories: product.calories,
        protein_g: product.protein,
        carbs_g: product.carbs,
        fats_g: product.fat,
        amount: product.amount,
        serving_size_g: product.serving_unit,
      },
    });
    navigation.navigate('AddMealScreen', {
      barcodeData: '',
      analyzedData: {
        name: product.name,
        calories: product.calories,
        protein: product.protein,
        carbs: product.carbs,
        fat: product.fat,
        amount: product.amount,
        serving_unit: product.serving_unit,
        logging_mode: 'barcode',
        read_only: true,
        hideImage: true, // Flag to hide the image section
      },
     defaultDate:defaultDate
    });
  };

  // const handleManualCapture = async () => {
  //   if (!cameraRef.current || isProcessing) return;

  //   setIsProcessing(true);

  //   try {
  //     // Take a picture with better quality settings
  //     const photo = await cameraRef.current.takePictureAsync({
  //       quality: 0.9,
  //       base64: false,
  //       skipProcessing: false,
  //     });

  //     // Process the image for barcode
  //     try {
  //       const response = await scanService.scanImage(photo.uri);

  //       if (response.items && response.items.length > 0) {
  //         const product = response.items[0];
  //         navigation.navigate("AddMealScreen", {
  //           barcodeData: "",
  //           analyzedData: {
  //             name: product.name,
  //             calories: product.calories,
  //             protein: product.protein,
  //             carbs: product.carbs,
  //             fat: product.fat,
  //             amount: product.amount,
  //             serving_unit: product.serving_unit,
  //             logging_mode: "barcode",
  //             read_only: product.read_only,
  //             hideImage: true, // Flag to hide the image section
  //           },
  //         });
  //       } else {
  //         Alert.alert(
  //           "No Barcode Detected",
  //           "We couldn't find a readable barcode in this image. Please try again or enter details manually.",
  //           [
  //             {
  //               text: "Try Again",
  //               onPress: () => setIsProcessing(false),
  //             },
  //             {
  //               text: "Add Manually",
  //               onPress: () => navigation.navigate("AddMealScreen", {}),
  //             },
  //           ]
  //         );
  //       }
  //     } catch (error) {
  //       console.error("Image processing error:", error);
  //       setIsProcessing(false);
  //       Alert.alert(
  //         "Processing Error",
  //         "There was an error processing the image. Please try again."
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Camera capture error:", error);
  //     setIsProcessing(false);
  //     Alert.alert(
  //       "Camera Error",
  //       "There was an error taking the picture. Please try again."
  //     );
  //   }
  // };

  const _openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to use this feature.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessing(true);

        try {
          const response = await scanService.scanImage(result.assets[0].uri);

          if (response.items && response.items.length > 0) {
            const product = response.items[0];
            navigation.navigate('AddMeal', {
              barcodeData: '',
              analyzedData: {
                name: product.name,
                calories: product.calories,
                protein: product.protein,
                carbs: product.carbs,
                fat: product.fat,
                amount: product.amount,
                serving_unit: product.serving_unit,
                logging_mode: 'barcode',
                read_only: product.read_only,
                hideImage: true, // Flag to hide the image section
              },
            });
          } else {
            Alert.alert(
              'No Barcode Detected',
              "We couldn't find a readable barcode in this image. Please try again or enter details manually.",
              [
                {
                  text: 'OK',
                  onPress: () => setIsProcessing(false),
                },
              ]
            );
          }
        } catch (error) {
          console.error('Image scan error:', error);
          setIsProcessing(false);
          Alert.alert(
            'Processing Error',
            'There was an error processing the image. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      setIsProcessing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-teal-600 px-6 py-3 rounded-full mb-4"
        >
          <Text className="text-white font-semibold">Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => {
            mixpanel?.track({
              name: 'barcode_scan_back_to_add_meal',
              properties: {
                gesture_type: 'button',
              },
            });
            navigation.goBack();
          }}
          className="p-1"
        >
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-black text-base font-semibold">
          Barcode scan
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <View className="w-full items-center bg-black">
        <View
          className="w-full mt-4 rounded-2xl overflow-hidden relative"
          style={{ aspectRatio: 1 }}
        >
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
            // enableTorch={flashMode === 'torch'}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13',
                'ean8',
                'upc_e',
                'upc_a',
                'code39',
                'code128',
                'itf14',
                'codabar',
                'qr',
                'pdf417',
                'aztec',
                'datamatrix',
              ],
            }}
            onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          />
          <View
            className="absolute inset-0 flex-1 justify-center items-center"
            pointerEvents="none"
          >
            <View className="absolute inset-0 bg-black/50 z-0">
              <View className="flex-1 items-center justify-center">
                <View
                  className="w-[70%]"
                  style={{ aspectRatio: 1, backgroundColor: 'transparent' }}
                />
              </View>
            </View>
            <View className="absolute w-[70%]" style={{ aspectRatio: 1 }}>
              <View
                className={`absolute top-0 left-0 w-16 h-16 border-t-[12px] border-l-[12px] ${
                  scanError ? 'border-[#DB2F2C]' : 'border-[#10bfae]'
                } rounded-tl-lg`}
              />
              <View
                className={`absolute top-0 right-0 w-16 h-16 border-t-[12px] border-r-[12px] ${
                  scanError ? 'border-[#DB2F2C]' : 'border-[#10bfae]'
                } rounded-tr-lg`}
              />
              <View
                className={`absolute bottom-0 left-0 w-16 h-16 border-b-[12px] border-l-[12px] ${
                  scanError ? 'border-[#DB2F2C]' : 'border-[#10bfae]'
                } rounded-bl-lg`}
              />
              <View
                className={`absolute bottom-0 right-0 w-16 h-16 border-b-[12px] border-r-[12px] ${
                  scanError ? 'border-[#DB2F2C]' : 'border-[#10bfae]'
                } rounded-tr-lg rounded-br-lg`}
              />
            </View>

            {/* Processing Indicator */}
            {isProcessing && (
              <View className="absolute inset-0 bg-black/70 justify-center items-center z-10">
                <View className="bg-transparent rounded-2xl p-6 items-center">
                  <ActivityIndicator size="large" color="#10bfae" />
                  <Text className="text-primary font-semibold mt-3 text-center">
                    Reading barcode...
                  </Text>
                  <Text className="text-primaryLight text-sm mt-1 text-center">
                    Please wait
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
      <View className="bg-black w-full py-4">
        <Text
          className={`text-center text-base ${scanError ? '' : 'text-white'}`}
          style={scanError ? { color: '#DB2F2C' } : {}}
        >
          {scanError
            ? 'Barcode scanner not recognising food item'
            : 'Center the barcode within the frame to scan'}
        </Text>
      </View>
      {/* <View className="flex-1 bg-white items-center justify-center">
        <TouchableOpacity
          className="w-20 h-20 bg-teal-600 rounded-full items-center justify-center"
          activeOpacity={0.8}
          onPress={() => {
            handleManualCapture();
          }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={40} color="#fff" />
        </TouchableOpacity>
      </View> */}
    </SafeAreaView>
  );
};

export default BarcodeScanScreen;
