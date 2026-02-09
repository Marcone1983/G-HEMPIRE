import axios from 'axios';
import { TelegramWebApp } from './telegram';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const API_BASE = `${SUPABASE_URL}/functions/v1`;

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
});

apiClient.interceptors.request.use((config) => {
  const initData = TelegramWebApp.getInitData();
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      TelegramWebApp.showAlert('Session expired. Please restart the app.');
      TelegramWebApp.close();
    }
    return Promise.reject(error);
  }
);

export const GameAPI = {
  async getPlayer(walletAddress) {
    const response = await apiClient.get(`/game-api/api/player/${walletAddress}`);
    return response.data;
  },

  async createPlayer(data) {
    const response = await apiClient.post('/game-api/api/player', data);
    return response.data;
  },

  async getGarden(playerId) {
    const response = await apiClient.get(`/game-api/api/garden/${playerId}`);
    return response.data;
  },

  async plantCrop(data) {
    const response = await apiClient.post('/game-api/api/garden/plant', data);
    return response.data;
  },

  async harvestCrop(data) {
    const response = await apiClient.post('/game-api/api/garden/harvest', data);
    return response.data;
  },

  async getShop() {
    const response = await apiClient.get('/game-api/api/shop');
    return response.data;
  },

  async purchaseItem(data) {
    const response = await apiClient.post('/game-api/api/shop/purchase', data);
    return response.data;
  },

  async getStaking(playerId) {
    const response = await apiClient.get(`/game-api/api/staking/${playerId}`);
    return response.data;
  },

  async stake(data) {
    const response = await apiClient.post('/game-api/api/staking/stake', data);
    return response.data;
  },

  async claimStakingRewards(playerId) {
    const response = await apiClient.post(`/game-api/api/staking/claim?player_id=${playerId}`);
    return response.data;
  },

  async claimDailyReward(data) {
    const response = await apiClient.post('/game-api/api/rewards/daily', data);
    return response.data;
  },

  async getReferrals(playerId) {
    const response = await apiClient.get(`/game-api/api/referrals/${playerId}`);
    return response.data;
  },

  async getLeaderboard() {
    const response = await apiClient.get('/game-api/api/leaderboard');
    return response.data;
  },

  async withdraw(data) {
    const response = await apiClient.post('/game-api/api/wallet/withdraw', data);
    return response.data;
  }
};

export default GameAPI;
