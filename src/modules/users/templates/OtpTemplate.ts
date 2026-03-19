const OTPBasedSMSVerificationTemplate = (otp: string, username: string, software: string, procedure: string) => {
  // return `Welcome to Pro910 Auctions! Your one-time verification code is: ${otp}.\nPlease enter this code within [X minutes/hours] to complete your registration.\nIf you didn't request this code, please ignore this message. Happy bidding!`;
  // return `Dear ${name}, Your OTP for Pro910 Auctions Signup is {#var#}. Use this Passcode to complete your {#var#}. Thank you -CVALLE`
  return `Dear ${username}, Your OTP: ${otp} for ${software}. Use it to complete ${procedure}. Thanks -CVALLE`;
  // return `Dear {#var#}, Your OTP for {#var#} is {#var#}. Use this Passcode to complete your {#var#}. Thank you -CVALLE`
};
export default OTPBasedSMSVerificationTemplate;


