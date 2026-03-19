const generateOTP = () =>

    Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');

export default generateOTP;