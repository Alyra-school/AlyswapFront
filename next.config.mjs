/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    config.resolve.alias["pino-pretty"] = false;
    config.resolve.alias["porto/internal"] = false;
    config.resolve.alias.porto = false;
    config.resolve.alias["@metamask/connect-evm"] = false;
    config.resolve.alias.accounts = false;
    return config;
  }
};

export default nextConfig;
