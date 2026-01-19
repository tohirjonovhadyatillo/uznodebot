SETTINGS: {
  subscription_check_interval: 300000, // 5 daqiqa
  max_retries: 3,
  request_timeout: 10000,
  cache_duration: 300000, // 5 minutes
  max_users_per_day: 1000,
  max_requests_per_minute: 30,
  
  // Broadcasting settings
  broadcast_batch_size: 20,
  broadcast_delay_ms: 1200,
  broadcast_max_users: 1000,
  
  maintenance_mode: false,
  debug_mode: process.env.NODE_ENV === "development",
},