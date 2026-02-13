import axiosInstance from './axios';

/**
 * Service for referral code operations
 */
export const referralService = {
  /**
   * Redeems a referral code for the authenticated user
   * @param referralCode - The referral code to redeem
   * @returns Response from the backend
   * @throws Error if the request fails
   */
  redeemReferralCode: async (referralCode: string): Promise<any> => {
    try {
      console.log('🎁 Redeeming referral code:', referralCode);
      const response = await axiosInstance.post('/referral-code/redeem', {
        referral_code: referralCode,
      });
      console.log('✅ Referral code redeemed successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error redeeming referral code:', error);
      throw error;
    }
  },

  /**
   * Verify a referral code
   * @param referralCode - The referral code to verify
   * @returns Response from the backend
   * @throws Error if the request fails
   */
  verifyReferralCode: async (referralCode: string): Promise<any> => {
    try {
      console.log('🔍 Verifying referral code:', referralCode);
      const response = await axiosInstance.post('/referral-code/validate', {
        referral_code: referralCode,
      });
      console.log('✅ Referral code verified successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error verifying referral code:', error);
      throw error;
    }
  },
};

export default referralService;
