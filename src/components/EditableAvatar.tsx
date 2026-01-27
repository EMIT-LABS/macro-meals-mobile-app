import { useMixpanel } from "@macro-meals/mixpanel/src";
import { usePosthog } from "@macro-meals/posthog_service/src";
import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import handleEditAvatar from "src/services/handleEditAvatar";
import useStore from "src/store/useStore";

interface EditableAvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const EditableAvatar: React.FC<EditableAvatarProps> = ({
  size = 70,
  style,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [justUploaded, setJustUploaded] = useState(false);
  const profile = useStore((state) => state.profile);
  console.log("profile is:", profile);
  const setProfile = useStore((state) => state.setProfile);
  const mixpanel = useMixpanel();
  const posthog = usePosthog()

  const handleAvatarEdit = async () => {
    mixpanel?.track({
      name: "avatar_edit_clicked",
      properties: {
        user_id: profile?.id,
        email: profile?.email,
      },
    });
     posthog?.track({
      name: "avatar_edit_clicked",
      properties: {
        user_id: profile?.id,
        email: profile?.email,
        avatar_current_state:avatarUrl
      },
    });
    await handleEditAvatar((newProfile: any) => {
      console.log("[EditableAvatar] setProfile called with:", newProfile);
      setProfile(newProfile);
    }, setIsProcessing);
    setAvatarVersion((v) => v + 1);
    setJustUploaded(true);
  };

  const avatarUrl = profile?.avatar_url
    ? `${profile.avatar_url}?t=${avatarVersion}` //cache busting to force reload
    : undefined;



  return (
    <TouchableOpacity
      onPress={handleAvatarEdit}
      disabled={isProcessing}
      style={[{ width: size, height: size }, style]}
      activeOpacity={0.7}
    >
      <Image
        source={
          avatarUrl
            ? { uri: `${avatarUrl}?v=${avatarVersion}` }
            : require("../../assets/person-icon.png")
        }
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#eee",
        }}
        onError={(e) => {
          if (justUploaded) {
            mixpanel?.track({
              name: "avatar_upload_failed",
              properties: {
                user_id: profile?.id,
                email: profile?.email,
                error_message: e.nativeEvent.error,
                attempted_url: avatarUrl,
              },
            });
            posthog?.track({
              name: "avatar_upload_failed",
              properties: {
                user_id: profile?.id,
                email: profile?.email,
                error_message: e.nativeEvent.error,
                attempted_url: avatarUrl,
              },
            });
            setJustUploaded(false);
          }
        }}
        onLoad={() => {
          if (justUploaded) {
            mixpanel?.track({
              name: "avatar_upload_success",
              properties: {
                user_id: profile?.id,
                email: profile?.email,
                avatar_url: avatarUrl,
              },
            });
            posthog?.track({
              name: "avatar_upload_success",
              properties: {
                user_id: profile?.id,
                email: profile?.email,
                avatar_url: avatarUrl,
                file_type:'',
                file_size:"",
                source:''
              },
            });
            setJustUploaded(false);
          }
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 6,
          bottom: 6,
          backgroundColor: "white",
          borderRadius: size / 5,
          padding: 3,
        }}
        pointerEvents="none"
      >
        {isProcessing ? (
          <ActivityIndicator size="small" />
        ) : (
          <Icon name="edit" size={size / 4} color="#333" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default EditableAvatar;
