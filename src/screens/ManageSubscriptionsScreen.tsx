import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomSafeAreaView from "../components/CustomSafeAreaView";
// import { paymentService } from '../services/paymentService';
// import { useMixpanel } from '@macro-meals/mixpanel';
import { useMixpanel } from "@macro-meals/mixpanel/src";
import revenueCatService from "../services/revenueCatService";

interface SubscriptionDetails {
  amount: number;
  billing_interval: string;
  cancel_at_period_end: boolean;
  created: string;
  currency: string;
  current_period_end: string;
  current_period_start: string;
  has_subscription: boolean;
  next_billing_date: string;
  plan: string;
  plan_name: string;
  status: string;
  subscription_id: string;
  trial_end: string;
}

const ManageSubscriptionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  // const [cancelling, setCancelling] = useState(false);
  // const [reactivating, setReactivating] = useState(false);
  // const [showCancelModal, setShowCancelModal] = useState(false);
  const mixpanel = useMixpanel();

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  useEffect(() => {
    if (subscription) {
      mixpanel?.track({
        name: "manage_subscription_screen_viewed",
        properties: {
          user_id: subscription.subscription_id,
          plan: subscription.plan,
          status: subscription.status,
        },
      });
    }
  }, [subscription]);

  const fetchSubscriptionDetails = async () => {
    // Commented out backend call
    // const data = await paymentService.getSubscriptionDetails();

    try {
      setLoading(true);

      // Use RevenueCat customerInfo
      const customerInfo = await revenueCatService.getCustomerInfo();
      console.log(
        "🔍 ManageSubscriptions - Customer info:",
        JSON.stringify(customerInfo, null, 2)
      );

      // Extract active entitlement (assume first active entitlement is the subscription)
      const activeEntitlement =
        customerInfo.entitlements?.active &&
        Object.values(customerInfo.entitlements.active)[0];
      const productId = activeEntitlement?.productIdentifier;
      console.log("🔍 ManageSubscriptions - Product ID:", productId);
      const subscription = productId
        ? customerInfo.subscriptionsByProductIdentifier[productId]
        : null;

      // Get real price from offerings (not from subscription which shows $0 during trial)
      let realPrice = 0;
      let realCurrency = "USD";

      if (productId) {
        try {
          const offerings = await revenueCatService.getOfferings();
          const matchedPackage = offerings?.availablePackages?.find(
            (pkg) => pkg.product.identifier === productId
          );
          if (matchedPackage) {
            realPrice = matchedPackage.product.price;
            realCurrency = matchedPackage.product.currencyCode;
            console.log("🔍 ManageSubscriptions - Real price from offerings:", {
              price: realPrice,
              currency: realCurrency,
              priceString: matchedPackage.product.priceString,
            });
          }
        } catch (error) {
          console.error("⚠️ Failed to get real price from offerings:", error);
        }
      }

      if (subscription) {
        console.log(
          "🔍 ManageSubscriptions - Full subscription:",
          JSON.stringify(subscription, null, 2)
        );
        console.log(
          "🔍 ManageSubscriptions - Trial price:",
          JSON.stringify((subscription as any).price, null, 2)
        );
      }

      // Map RevenueCat data to SubscriptionDetails shape
      const mapped: SubscriptionDetails | null = subscription
        ? {
            amount:
              realPrice > 0
                ? realPrice
                : (subscription as any).price?.amount ?? 0,
            billing_interval:
              subscription.periodType === "TRIAL" ? "trial" : "regular",
            cancel_at_period_end: !subscription.willRenew,
            created: subscription.originalPurchaseDate || "",
            currency:
              realCurrency || (subscription as any).price?.currency || "USD",
            current_period_end: subscription.expiresDate || "",
            current_period_start: subscription.purchaseDate || "",
            has_subscription: subscription.isActive,
            next_billing_date: subscription.expiresDate || "",
            plan: "premium",
            plan_name: "Premium Plan",
            status: subscription.isActive
              ? subscription.periodType === "TRIAL"
                ? "trialing"
                : "active"
              : "canceled",
            subscription_id: productId || "",
            trial_end:
              subscription.periodType === "TRIAL"
                ? subscription.expiresDate || ""
                : "",
          }
        : null;

      setSubscription(mapped);
    } catch (error: any) {
      console.error("Failed to fetch subscription details:", error);
      const errorMessage =
        error.message || "Failed to load subscription details";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount); // Amount is already in the correct units
  };

  const getPlanDisplayName = (plan: string, planName: string) => {
    if (plan === "premium") {
      return planName || "Premium Plan";
    } else if (plan === "basic") {
      return planName || "Basic Plan";
    }
    return planName || "Subscription";
  };

  // const capitalizeFirstLetter = (str: string) => {
  //   if (!str) return str;
  //   return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  // };

  const getStatusDisplay = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return `Cancelled (ends ${formatDate(
        subscription?.current_period_end || ""
      )})`;
    }

    const statusMap: { [key: string]: string } = {
      active: "Active",
      canceled: "Cancelled",
      past_due: "Past Due",
      unpaid: "Unpaid",
      trialing: "Trial",
    };

    return statusMap[status] || status;
  };

  const handleCancelSubscription = () => {
    // With RevenueCat, users must cancel through Apple/Google
    mixpanel?.track({
      name: "cancel_subscription_clicked",
      properties: {
        user_id: subscription?.subscription_id,
        plan: subscription?.plan,
        status: subscription?.status,
      },
    });
    Alert.alert(
      "Cancel Subscription",
      "To cancel your subscription, please use your device settings:\n\niOS: Settings → Apple ID → Subscriptions\nAndroid: Google Play Store → Subscriptions",
      [
        {
          text: "Open Settings",
          onPress: () => {
            mixpanel?.track({
              name: "cancel_subscription_confirmed",
              properties: {
                user_id: subscription?.subscription_id,
                plan: subscription?.plan,
                status: subscription?.status,
              },
            });
            openSubscriptionSettings();
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            mixpanel?.track({
              name: "cancel_subscription_failed",
              properties: {
                user_id: subscription?.subscription_id,
                plan: subscription?.plan,
                status: subscription?.status,
              },
            });
          },
        },
      ]
    );
  };

  const openSubscriptionSettings = () => {
    // Open the platform's subscription management
    try {
      if (Platform.OS === "ios") {
        // iOS: Opens App Store subscription management
        const url = "https://apps.apple.com/account/subscriptions";
        Linking.openURL(url);
      } else {
        // Android: Opens Google Play subscription management
        const url = "https://play.google.com/store/account/subscriptions";
        Linking.openURL(url);
      }
    } catch (error) {
      console.error("Failed to open subscription settings:", error);
    }
  };

  const handleReactivateSubscription = async (_subscription_id: string) => {
    // With RevenueCat, users need to resubscribe through the purchase flow
    Alert.alert(
      "Reactivate Subscription",
      "To reactivate your subscription, you'll need to subscribe again through our payment screen.",
      [
        {
          text: "Subscribe Again",
          onPress: () => {
            mixpanel?.track({
              name: "subscription_reactivated",
              properties: {
                user_id: subscription?.subscription_id,
                plan: subscription?.plan,
                status: subscription?.status,
              },
            });
            navigation.navigate("PaymentScreen" as never);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Remove old backend-based cancellation since RevenueCat uses platform management

  //   if (loading) {
  //     return (
  //       <View className="flex-1 justify-center items-center bg-white">
  //         <ActivityIndicator size="large" color="#19a28f" />
  //       </View>
  //     );
  //   }

  return (
    <CustomSafeAreaView className="flex-1 bg-white" edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ backgroundColor: "#f8f8f8", flexGrow: 1 }}
      >
        {/* Header - Always visible */}
        <View className="flex-row bg-white items-center justify-between px-5 pt-4 pb-5 mb-5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-8 h-8 rounded-full justify-center items-center bg-[#F5F5F5]"
          >
            <Text className="text-[22px]">‹</Text>
          </TouchableOpacity>
          <Text className="text-[20px] font-semibold text-[#222] text-center">
            Manage Subscription
          </Text>
          <View className="w-8" />
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#19a28f" />
          </View>
        ) : (
          <>
            {!subscription ? (
              // No subscription data at all
              <View className="bg-white rounded-2xl mx-3 px-6 py-8 shadow-sm">
                <Text className="text-lg font-semibold text-[#222] text-center mb-2">
                  No Active Subscription
                </Text>
                <Text className="text-base text-[#888] text-center">
                  You don't have an active subscription. Subscribe to unlock
                  premium features.
                </Text>
              </View>
            ) : (
              // Has subscription state
              <>
                {/* Subscription Details Card */}
                <View className="bg-white rounded-2xl mx-3 px-0 py-0 shadow-sm">
                  {/* Plan */}
                  <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
                    <Text className="flex-1 text-base text-[#222]">Plan</Text>
                    <Text className="text-base text-[#222] font-medium">
                      {subscription?.plan && subscription?.plan_name
                        ? getPlanDisplayName(
                            subscription.plan,
                            subscription.plan_name
                          )
                        : "Subscription"}
                    </Text>
                  </View>

                  {/* Status */}
                  <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
                    <Text className="flex-1 text-base text-[#222]">Status</Text>
                    <View className="flex-row items-center">
                      <View
                        className={`w-2 h-2 rounded-full mr-2 ${
                          subscription.cancel_at_period_end
                            ? "bg-orange-500"
                            : subscription.status === "active"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <Text
                        className={`text-base font-medium ${
                          subscription.cancel_at_period_end
                            ? "text-orange-600"
                            : subscription.status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {getStatusDisplay(
                          subscription.status,
                          subscription.cancel_at_period_end
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Amount */}
                  {subscription?.amount && subscription?.currency && (
                    <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
                      <Text className="flex-1 text-base text-[#222]">
                        Amount
                      </Text>
                      <Text className="text-base text-[#222] font-medium">
                        {formatCurrency(
                          subscription.amount,
                          subscription.currency
                        )}
                        {subscription.billing_interval && (
                          <Text className="text-[#888] font-normal">
                            /{subscription.billing_interval}
                          </Text>
                        )}
                      </Text>
                    </View>
                  )}

                  {/* Next Billing Date */}
                  {subscription?.next_billing_date && (
                    <View className="flex-row items-center min-h-[56px] border-b border-[#f0f0f0] px-4">
                      <Text className="flex-1 text-base text-[#222]">
                        Next billing date
                      </Text>
                      <Text className="text-base text-[#222]">
                        {formatDate(subscription.next_billing_date)}
                      </Text>
                    </View>
                  )}

                  {/* Current Period */}
                  {subscription?.current_period_start &&
                    subscription?.current_period_end && (
                      <View className="flex-row items-center min-h-[56px] px-4">
                        <Text className="flex-1 text-base text-[#222]">
                          Current period
                        </Text>
                        <Text className="text-base text-[#222] text-right">
                          {formatDate(subscription.current_period_start)} -{" "}
                          {formatDate(subscription.current_period_end)}
                        </Text>
                      </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="mt-8 mx-4">
                  {subscription?.cancel_at_period_end ? (
                    // Resubscribe button when subscription is cancelled but still active until period end
                    <TouchableOpacity
                      className="pl-4 flex-row justify-start bg-white rounded-xl py-6"
                      onPress={() =>
                        handleReactivateSubscription(
                          subscription?.subscription_id || ""
                        )
                      }
                    >
                      <Text className="text-[#19a28f] text-left font-semibold text-base">
                        Resubscribe
                      </Text>
                    </TouchableOpacity>
                  ) : !subscription?.has_subscription ? (
                    // Reactivate button for cancelled subscriptions (when has_subscription is false)
                    <TouchableOpacity
                      className="pl-4 flex-row justify-start bg-white rounded-xl py-6"
                      onPress={() =>
                        handleReactivateSubscription(
                          subscription?.subscription_id || ""
                        )
                      }
                    >
                      <Text className="text-[#19a28f] text-left font-semibold text-base">
                        Reactivate Subscription
                      </Text>
                    </TouchableOpacity>
                  ) : subscription?.has_subscription ? (
                    // Cancel button for active subscriptions
                    <TouchableOpacity
                      className="pl-4 flex-row justify-start bg-white rounded-xl py-6"
                      onPress={handleCancelSubscription}
                    >
                      <Text className="text-punchRed text-left font-semibold text-base">
                        Cancel Subscription
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            )}

            {/* Modal removed - RevenueCat uses platform-native subscription management */}
          </>
        )}
      </ScrollView>
    </CustomSafeAreaView>
  );
};

export default ManageSubscriptionsScreen;
