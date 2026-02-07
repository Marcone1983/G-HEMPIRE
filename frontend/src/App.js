import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { TonConnectUIProvider, useTonConnectUI, useTonAddress, useTonConnectModal } from "@tonconnect/ui-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import axios from "axios";
import {
  Sprout, ShoppingBag, Wallet, Trophy, User, Settings, Users, 
  Zap, Clock, Coins, Gem, Lock, Unlock, ChevronRight, Gift,
  TrendingUp, Star, Award, Copy, ExternalLink, Loader2, Check,
  Leaf, Timer, Crown, Diamond, CircleDollarSign, ArrowUpRight
} from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Manifest for TON Connect
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

// Format numbers with separators
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return Math.floor(num).toLocaleString();
};

// Format time remaining
const formatTime = (seconds) => {
  if (seconds <= 0) return "Ready!";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// Rarity badge component
const RarityBadge = ({ rarity }) => {
  const colors = {
    common: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    uncommon: "bg-green-500/20 text-green-400 border-green-500/30",
    rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    mythic: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${colors[rarity] || colors.common}`}>
      {rarity?.toUpperCase()}
    </span>
  );
};

// VIP Badge
const VIPBadge = ({ tier }) => {
  if (tier === "none") return null;
  const styles = {
    bronze: "vip-bronze",
    silver: "vip-silver",
    gold: "vip-gold",
    diamond: "vip-diamond",
  };
  const icons = {
    bronze: <Award className="w-4 h-4" />,
    silver: <Award className="w-4 h-4" />,
    gold: <Crown className="w-4 h-4" />,
    diamond: <Diamond className="w-4 h-4" />,
  };
  return (
    <span className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full border ${styles[tier]}`}>
      {icons[tier]} {tier.toUpperCase()}
    </span>
  );
};

// Balance Bar Component
const BalanceBar = ({ player, onRefresh }) => {
  return (
    <div className="glass rounded-xl p-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="number-display font-semibold text-yellow-400">{formatNumber(player?.coins || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Leaf className="w-5 h-5 text-[#39FF14]" />
            <span className="number-display font-semibold text-[#39FF14]">{formatNumber(player?.gleaf || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gem className="w-5 h-5 text-purple-400" />
            <span className="number-display font-semibold text-purple-400">{formatNumber(player?.gems || 0)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">{player?.energy || 0}/{player?.max_energy || 100}</span>
          </div>
          <VIPBadge tier={player?.vip_tier || "none"} />
        </div>
      </div>
    </div>
  );
};

// Growth phase images - 8 stages from seedling to harvest
const GROWTH_PHASES = {
  1: "/seedling_1.png",     // Tiny seedling just sprouted
  2: "/seedling_2.png",     // Small seedling growing
  3: "/vegetative_1.png",   // Early vegetative stage
  4: "/vegetative_2.png",   // Mid vegetative stage  
  5: "/vegetative_3.png",   // Late vegetative (bushy)
  6: "/plant_phase3.png",   // Pre-flowering with buds forming
  7: "/plant_phase4.png",   // Flowering/Mature (golden)
  8: "/plant_ready.png",    // Ready to harvest (bud)
};

// Phase names for display
const PHASE_NAMES = {
  1: "Seedling",
  2: "Sprouting", 
  3: "Vegetative",
  4: "Growing",
  5: "Bushy",
  6: "Pre-Flower",
  7: "Flowering",
  8: "Ready!"
};

// Get growth phase based on time remaining (8 phases)
const getGrowthPhase = (timeRemaining, totalTime) => {
  if (timeRemaining <= 0) return 8; // Ready
  const progress = 1 - (timeRemaining / totalTime);
  if (progress < 0.12) return 1;  // 0-12%
  if (progress < 0.25) return 2;  // 12-25%
  if (progress < 0.38) return 3;  // 25-38%
  if (progress < 0.50) return 4;  // 38-50%
  if (progress < 0.65) return 5;  // 50-65%
  if (progress < 0.80) return 6;  // 65-80%
  if (progress < 0.95) return 7;  // 80-95%
  return 7;
};

// Plot Card Component
const PlotCard = ({ plot, crops, onPlant, onHarvest, playerLevel }) => {
  const [showCropSelect, setShowCropSelect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(plot?.time_remaining || 0);

  useEffect(() => {
    if (plot?.crop_type && !plot?.is_ready && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [plot?.crop_type, plot?.is_ready, timeRemaining]);

  const crop = plot?.crop_type ? crops[plot.crop_type] : null;

  if (!plot?.unlocked) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="card-plot rounded-xl aspect-square flex flex-col items-center justify-center gap-2 cursor-pointer opacity-50"
        data-testid={`plot-locked-${plot?.slot}`}
      >
        <Lock className="w-8 h-8 text-gray-500" />
        <span className="text-xs text-gray-500">{formatNumber(plot?.unlock_cost)} coins</span>
      </motion.div>
    );
  }

  if (plot?.crop_type) {
    const isReady = timeRemaining <= 0 || plot?.is_ready;
    const totalTime = crop?.time || 3600;
    const phase = getGrowthPhase(timeRemaining, totalTime);
    const progressPercent = Math.min(100, Math.max(0, ((totalTime - timeRemaining) / totalTime) * 100));
    const phaseName = PHASE_NAMES[phase] || `Phase ${phase}`;
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`card-plot rounded-xl aspect-square flex flex-col items-center justify-center p-2 cursor-pointer relative overflow-hidden ${isReady ? 'ready' : 'growing'}`}
        onClick={() => isReady && onHarvest(plot.slot)}
        data-testid={`plot-growing-${plot?.slot}`}
      >
        {/* Plant Image */}
        <motion.img
          key={phase}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          src={GROWTH_PHASES[phase]}
          alt={crop?.name}
          className={`w-full h-20 object-contain ${isReady ? 'animate-float' : ''}`}
        />
        
        {/* Crop Name */}
        <span className="text-xs font-medium mt-1 truncate w-full text-center">{crop?.name}</span>
        
        {/* Progress Bar or Harvest Button */}
        {isReady ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary px-3 py-1 text-xs rounded-lg mt-1 neon-glow"
          >
            HARVEST
          </motion.button>
        ) : (
          <div className="w-full mt-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#39FF14] font-medium">{phaseName}</span>
              <span className="flex items-center gap-1 text-gray-400">
                <Timer className="w-3 h-3" />
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#39FF14] to-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
        
        {/* Rarity Indicator */}
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full rarity-${crop?.rarity}`} 
          style={{ backgroundColor: 'currentColor' }} 
        />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="card-plot rounded-xl aspect-square flex flex-col items-center justify-center gap-2 cursor-pointer"
        onClick={() => setShowCropSelect(true)}
        data-testid={`plot-empty-${plot?.slot}`}
      >
        <Sprout className="w-8 h-8 text-gray-500" />
        <span className="text-xs text-gray-500">Tap to plant</span>
      </motion.div>

      <AnimatePresence>
        {showCropSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
            onClick={() => setShowCropSelect(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md glass rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 text-[#39FF14]">Select Crop</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(crops).map(([key, c]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={playerLevel < c.level}
                    onClick={() => {
                      onPlant(plot.slot, key);
                      setShowCropSelect(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      playerLevel >= c.level
                        ? "glass border-white/10 hover:border-[#39FF14]/50"
                        : "opacity-40 cursor-not-allowed border-white/5"
                    }`}
                    data-testid={`crop-select-${key}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src="/plant_phase1.png" 
                        alt={c.name} 
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <div className="font-semibold text-sm">{c.name}</div>
                        <RarityBadge rarity={c.rarity} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span className="text-yellow-400">{formatNumber(c.cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{formatTime(c.time)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reward:</span>
                        <span className="text-yellow-400">{formatNumber(c.reward)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GLeaf:</span>
                        <span className="text-[#39FF14]">+{c.gleaf}</span>
                      </div>
                      {playerLevel < c.level && (
                        <div className="text-red-400 mt-1">Level {c.level} required</div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Garden Page
const GardenPage = ({ player, onRefresh }) => {
  const [garden, setGarden] = useState({ plots: [], crops: {} });
  const [loading, setLoading] = useState(true);

  const fetchGarden = useCallback(async () => {
    if (!player?.id) return;
    try {
      const res = await axios.get(`${API}/garden/${player.id}`);
      setGarden(res.data);
    } catch (err) {
      console.error("Failed to fetch garden:", err);
    } finally {
      setLoading(false);
    }
  }, [player?.id]);

  useEffect(() => {
    fetchGarden();
    const interval = setInterval(fetchGarden, 10000);
    return () => clearInterval(interval);
  }, [fetchGarden]);

  const handlePlant = async (slot, cropType) => {
    try {
      await axios.post(`${API}/garden/plant`, {
        player_id: player.id,
        slot,
        crop_type: cropType,
      });
      toast.success("Crop planted!");
      fetchGarden();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to plant");
    }
  };

  const handleHarvest = async (slot) => {
    try {
      const res = await axios.post(`${API}/garden/harvest`, {
        player_id: player.id,
        slot,
      });
      const { rewards, level_up, new_level } = res.data;
      toast.success(
        <div>
          <div className="font-bold">Harvest Complete!</div>
          <div className="text-sm">+{formatNumber(rewards.coins)} Coins</div>
          <div className="text-sm text-[#39FF14]">+{rewards.gleaf} GLeaf</div>
          {level_up && <div className="text-yellow-400">Level Up! Now Level {new_level}</div>}
        </div>
      );
      fetchGarden();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to harvest");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#39FF14]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-[#39FF14]">Cannabis</span> Garden
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold">Lvl {player?.level || 1}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {garden.plots.map((plot) => (
          <PlotCard
            key={plot.slot}
            plot={plot}
            crops={garden.crops}
            onPlant={handlePlant}
            onHarvest={handleHarvest}
            playerLevel={player?.level || 1}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Shop Page
const ShopPage = ({ player, onRefresh }) => {
  const [shop, setShop] = useState(null);
  const [activeTab, setActiveTab] = useState("boosts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await axios.get(`${API}/shop`);
        setShop(res.data);
      } catch (err) {
        console.error("Failed to fetch shop:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, []);

  const handlePurchase = async (itemId, category) => {
    try {
      await axios.post(`${API}/shop/purchase`, {
        player_id: player.id,
        item_id: itemId,
        category,
      });
      toast.success("Purchase successful!");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Purchase failed");
    }
  };

  const tabs = [
    { id: "boosts", label: "Boosts", icon: <Zap className="w-4 h-4" /> },
    { id: "premium", label: "VIP", icon: <Crown className="w-4 h-4" /> },
    { id: "cosmetics", label: "Cosmetics", icon: <Star className="w-4 h-4" /> },
    { id: "nfts", label: "NFTs", icon: <Diamond className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#39FF14]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">Empire</span> Shop
      </h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "tab-active border-[#39FF14] bg-[#39FF14]/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            data-testid={`shop-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {shop?.[activeTab]?.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.01 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                {item.effect && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(item.effect).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 bg-[#39FF14]/10 text-[#39FF14] text-xs rounded">
                        {k}: {v}x
                      </span>
                    ))}
                  </div>
                )}
                {item.tier && <VIPBadge tier={item.tier} />}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-bold">
                  <Gem className="w-5 h-5 text-purple-400" />
                  {item.price}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePurchase(item.id, activeTab)}
                  disabled={player?.gems < item.price}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    player?.gems >= item.price
                      ? "btn-primary"
                      : "bg-gray-600 cursor-not-allowed opacity-50"
                  }`}
                  data-testid={`buy-${item.id}`}
                >
                  BUY
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gems Packages */}
      <h2 className="text-xl font-bold mt-8 mb-4">
        <span className="text-purple-400">Buy</span> Gems
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "gems_starter", name: "Starter", gems: 100, stars: 50 },
          { id: "gems_value", name: "Value", gems: 550, stars: 200, bonus: 50 },
          { id: "gems_pro", name: "Pro", gems: 1200, stars: 400, bonus: 200 },
          { id: "gems_empire", name: "Empire", gems: 8000, stars: 2000, bonus: 2000, popular: true },
        ].map((pkg) => (
          <motion.div
            key={pkg.id}
            whileHover={{ scale: 1.02 }}
            className={`glass rounded-xl p-4 relative ${pkg.popular ? "border-purple-500 neon-border" : ""}`}
          >
            {pkg.popular && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-xs font-bold rounded-full">
                BEST VALUE
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-6 h-6 text-purple-400" />
              <span className="font-bold">{pkg.name}</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {formatNumber(pkg.gems + (pkg.bonus || 0))}
            </div>
            {pkg.bonus && (
              <div className="text-xs text-green-400">+{pkg.bonus} bonus!</div>
            )}
            <div className="text-sm text-gray-400 mt-1">
              <Star className="w-3 h-3 inline" /> {pkg.stars} Stars
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Staking Page
const StakingPage = ({ player, onRefresh }) => {
  const [stakingInfo, setStakingInfo] = useState(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStaking = useCallback(async () => {
    if (!player?.id) return;
    try {
      const res = await axios.get(`${API}/staking/${player.id}`);
      setStakingInfo(res.data);
    } catch (err) {
      console.error("Failed to fetch staking:", err);
    } finally {
      setLoading(false);
    }
  }, [player?.id]);

  useEffect(() => {
    fetchStaking();
  }, [fetchStaking]);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount < 100) {
      toast.error("Minimum stake is 100 GLeaf");
      return;
    }
    try {
      await axios.post(`${API}/staking/stake`, {
        player_id: player.id,
        amount,
      });
      toast.success(`Staked ${amount} GLeaf!`);
      setStakeAmount("");
      fetchStaking();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Staking failed");
    }
  };

  const handleClaim = async () => {
    try {
      const res = await axios.post(`${API}/staking/claim?player_id=${player.id}`);
      toast.success(`Claimed ${res.data.claimed} GLeaf!`);
      fetchStaking();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Claim failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#39FF14]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">GLeaf</span> Staking
      </h1>

      <div className="glass rounded-xl p-6 mb-4">
        <div className="text-center mb-6">
          <div className="text-sm text-gray-400 mb-1">Total Staked</div>
          <div className="text-4xl font-bold text-[#39FF14] number-display">
            {formatNumber(stakingInfo?.staked_amount || 0)}
          </div>
          <div className="text-sm text-gray-400">GLeaf</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-gray-400">Daily Reward</div>
            <div className="text-lg font-bold text-[#39FF14]">
              +{formatNumber(stakingInfo?.daily_reward || 0)}
            </div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-gray-400">Accumulated</div>
            <div className="text-lg font-bold text-yellow-400">
              {formatNumber(stakingInfo?.accumulated_rewards || 0)}
            </div>
          </div>
        </div>

        {stakingInfo?.accumulated_rewards >= 1 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            className="w-full btn-primary py-3 rounded-xl mb-4"
            data-testid="claim-rewards-btn"
          >
            CLAIM {formatNumber(stakingInfo.accumulated_rewards)} GLEAF
          </motion.button>
        )}
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="font-bold mb-4">Stake GLeaf</h3>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount (min 100)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-[#39FF14] focus:outline-none"
              data-testid="stake-input"
            />
            <button
              onClick={() => setStakeAmount(String(stakingInfo?.available_gleaf || 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[#39FF14] hover:bg-[#39FF14]/10 rounded"
            >
              MAX
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-400 mb-4">
          Available: <span className="text-[#39FF14]">{formatNumber(stakingInfo?.available_gleaf || 0)}</span> GLeaf
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStake}
          className="w-full btn-primary py-3 rounded-xl"
          data-testid="stake-btn"
        >
          STAKE GLEAF
        </motion.button>
      </div>

      <div className="glass rounded-xl p-4 mt-4">
        <h4 className="font-semibold mb-2">Staking Benefits</h4>
        <ul className="text-sm text-gray-400 space-y-2">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#39FF14]" />
            0.1% daily rewards on staked GLeaf
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#39FF14]" />
            VIP tier multipliers apply to rewards
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#39FF14]" />
            No lock-up period - unstake anytime
          </li>
        </ul>
      </div>
    </motion.div>
  );
};

// Wallet Page
const WalletPage = ({ player, onRefresh }) => {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const { open } = useTonConnectModal();
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 100) {
      toast.error("Minimum withdrawal is 100 GLeaf");
      return;
    }
    if (amount > player?.gleaf) {
      toast.error("Insufficient balance");
      return;
    }
    try {
      await axios.post(`${API}/wallet/withdraw`, {
        player_id: player.id,
        amount,
        currency: "gleaf",
      });
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Withdrawal failed");
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress || player?.wallet_address);
    toast.success("Address copied!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">TON</span> Wallet
      </h1>

      {/* Wallet Connection */}
      <div className="glass rounded-xl p-6 mb-4">
        {walletAddress ? (
          <div>
            <div className="text-sm text-gray-400 mb-2">Connected Wallet</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white/5 rounded-lg text-sm truncate">
                {walletAddress}
              </code>
              <button
                onClick={copyAddress}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => tonConnectUI.disconnect()}
              className="mt-4 text-sm text-red-400 hover:text-red-300"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={open}
            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
            data-testid="connect-wallet-btn"
          >
            <Wallet className="w-5 h-5" />
            Connect TON Wallet
          </motion.button>
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass rounded-xl p-4 text-center">
          <Leaf className="w-8 h-8 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-bold text-[#39FF14] number-display">
            {formatNumber(player?.gleaf || 0)}
          </div>
          <div className="text-sm text-gray-400">GLeaf</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <Coins className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold text-yellow-400 number-display">
            {formatNumber(player?.coins || 0)}
          </div>
          <div className="text-sm text-gray-400">Coins</div>
        </div>
      </div>

      {/* Withdraw */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-[#39FF14]" />
          Withdraw GLeaf
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount (min 100)"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-[#39FF14] focus:outline-none"
            data-testid="withdraw-input"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWithdraw}
          disabled={!walletAddress}
          className={`w-full py-3 rounded-xl font-bold ${
            walletAddress ? "btn-primary" : "bg-gray-600 cursor-not-allowed"
          }`}
          data-testid="withdraw-btn"
        >
          {walletAddress ? "WITHDRAW" : "Connect Wallet First"}
        </motion.button>
      </div>
    </motion.div>
  );
};

// Referrals Page
const ReferralsPage = ({ player }) => {
  const [referralInfo, setReferralInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!player?.id) return;
      try {
        const res = await axios.get(`${API}/referrals/${player.id}`);
        setReferralInfo(res.data);
      } catch (err) {
        console.error("Failed to fetch referrals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [player?.id]);

  const copyReferralLink = () => {
    const link = `https://t.me/CannabisEmpireBot?start=${referralInfo?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#39FF14]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">Referral</span> Program
      </h1>

      <div className="glass rounded-xl p-6 mb-4">
        <div className="text-center mb-4">
          <Users className="w-12 h-12 mx-auto mb-2 text-[#39FF14]" />
          <h3 className="text-xl font-bold">Invite Friends & Earn</h3>
          <p className="text-sm text-gray-400 mt-1">
            Earn {(referralInfo?.bonus_rate * 100).toFixed(0)}% of your referrals' GLeaf
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 mb-4">
          <div className="text-xs text-gray-400 mb-1">Your Referral Code</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-mono text-[#39FF14]">
              {referralInfo?.referral_code}
            </code>
            <button
              onClick={copyReferralLink}
              className="p-2 bg-[#39FF14]/10 rounded-lg hover:bg-[#39FF14]/20"
            >
              <Copy className="w-5 h-5 text-[#39FF14]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold">{referralInfo?.referral_count || 0}</div>
            <div className="text-xs text-gray-400">Total Referrals</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-[#39FF14]">
              {formatNumber(referralInfo?.referral_earnings || 0)}
            </div>
            <div className="text-xs text-gray-400">GLeaf Earned</div>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="glass rounded-xl p-4">
        <h4 className="font-semibold mb-3">Your Referrals</h4>
        {referralInfo?.referrals?.length > 0 ? (
          <div className="space-y-2">
            {referralInfo.referrals.map((ref, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="font-medium">{ref.username}</span>
                <span className="text-sm text-gray-400">Level {ref.level}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No referrals yet. Share your link!
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Leaderboard Page
const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API}/leaderboard`);
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#39FF14]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">Empire</span> Leaderboard
      </h1>

      <div className="space-y-2">
        {leaderboard.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass rounded-xl p-4 flex items-center gap-4 ${
              i < 3 ? "border border-yellow-500/30" : ""
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              i === 0 ? "bg-yellow-500 text-black" :
              i === 1 ? "bg-gray-400 text-black" :
              i === 2 ? "bg-amber-700 text-white" :
              "bg-white/10 text-gray-400"
            }`}>
              {entry.rank}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{entry.username}</span>
                <VIPBadge tier={entry.vip_tier} />
              </div>
              <div className="text-xs text-gray-400">{entry.wallet_address}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[#39FF14] number-display">
                {formatNumber(entry.gleaf)}
              </div>
              <div className="text-xs text-gray-400">Level {entry.level}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Profile Page
const ProfilePage = ({ player, onRefresh }) => {
  const [showDailyReward, setShowDailyReward] = useState(false);

  const claimDailyReward = async () => {
    try {
      const res = await axios.post(`${API}/rewards/daily`, { player_id: player.id });
      const { streak, rewards } = res.data;
      toast.success(
        <div>
          <div className="font-bold">Day {streak} Streak!</div>
          <div>+{rewards.coins} Coins</div>
          <div className="text-[#39FF14]">+{rewards.gleaf} GLeaf</div>
          <div className="text-purple-400">+{rewards.gems} Gems</div>
        </div>
      );
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Already claimed today");
    }
  };

  // Calculate XP progress
  const xpNeeded = player?.level * 100;
  const xpProgress = ((player?.xp || 0) / xpNeeded) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 pb-24"
    >
      <h1 className="text-2xl font-bold mb-4">
        <span className="text-[#39FF14]">My</span> Profile
      </h1>

      {/* Profile Card */}
      <div className="glass rounded-xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#39FF14] to-green-600 flex items-center justify-center text-2xl font-bold text-black">
            {(player?.username || "G")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{player?.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <VIPBadge tier={player?.vip_tier || "none"} />
              <span className="text-sm text-gray-400">Level {player?.level}</span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">XP Progress</span>
            <span>{player?.xp || 0} / {xpNeeded}</span>
          </div>
          <div className="progress-bar h-2 rounded-full">
            <div
              className="progress-bar-fill rounded-full"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-yellow-400">{formatNumber(player?.total_earned || 0)}</div>
            <div className="text-xs text-gray-400">Total Earned</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-lg font-bold text-[#39FF14]">{formatNumber(player?.total_staked || 0)}</div>
            <div className="text-xs text-gray-400">Total Staked</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-lg font-bold">{player?.referral_count || 0}</div>
            <div className="text-xs text-gray-400">Referrals</div>
          </div>
        </div>
      </div>

      {/* Daily Reward */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="glass rounded-xl p-4 mb-4 cursor-pointer border border-yellow-500/30"
        onClick={claimDailyReward}
        data-testid="daily-reward-btn"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Daily Reward</h3>
            <p className="text-sm text-gray-400">
              Streak: {player?.daily_streak || 0} days
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400" />
        </div>
      </motion.div>

      {/* Active Boosts */}
      {player?.active_boosts?.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Active Boosts
          </h3>
          <div className="space-y-2">
            {player.active_boosts.map((boost, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span>{boost.name}</span>
                <span className="text-xs text-gray-400">
                  Expires: {new Date(boost.expires_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Navigation Component
const Navigation = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: "garden", icon: Sprout, label: "Garden" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    { id: "staking", icon: TrendingUp, label: "Stake" },
    { id: "wallet", icon: Wallet, label: "Wallet" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav h-24 flex justify-around items-start pt-2 z-50 pb-8 max-w-md mx-auto">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            currentPage === item.id
              ? "text-[#39FF14]"
              : "text-gray-500 hover:text-gray-300"
          }`}
          data-testid={`nav-${item.id}`}
        >
          <item.icon className={`w-6 h-6 ${currentPage === item.id ? "neon-text" : ""}`} />
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// Main App Content
const AppContent = () => {
  const walletAddress = useTonAddress();
  const { open } = useTonConnectModal();
  const [player, setPlayer] = useState(null);
  const [currentPage, setCurrentPage] = useState("garden");
  const [loading, setLoading] = useState(true);

  const fetchPlayer = useCallback(async () => {
    const address = walletAddress || localStorage.getItem("temp_wallet");
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API}/player/${address}`);
      setPlayer(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        // Create new player
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const referrer = urlParams.get("ref");
          
          const res = await axios.post(`${API}/player`, {
            wallet_address: address,
            referrer_id: referrer,
          });
          setPlayer(res.data);
          toast.success("Welcome to Cannabis Empire!");
        } catch (createErr) {
          console.error("Failed to create player:", createErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  // Generate temp wallet for demo if no wallet connected
  useEffect(() => {
    if (!walletAddress && !localStorage.getItem("temp_wallet")) {
      const tempWallet = "UQ" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("temp_wallet", tempWallet);
      fetchPlayer();
    }
  }, [walletAddress, fetchPlayer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#39FF14] mx-auto mb-4" />
          <div className="text-xl font-bold text-[#39FF14]">Cannabis Empire</div>
          <div className="text-sm text-gray-400">Loading your empire...</div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "garden":
        return <GardenPage player={player} onRefresh={fetchPlayer} />;
      case "shop":
        return <ShopPage player={player} onRefresh={fetchPlayer} />;
      case "staking":
        return <StakingPage player={player} onRefresh={fetchPlayer} />;
      case "wallet":
        return <WalletPage player={player} onRefresh={fetchPlayer} />;
      case "referrals":
        return <ReferralsPage player={player} />;
      case "leaderboard":
        return <LeaderboardPage />;
      case "profile":
      default:
        return <ProfilePage player={player} onRefresh={fetchPlayer} />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Header with balance */}
      <div className="sticky top-0 z-40 p-4 safe-area-top">
        <BalanceBar player={player} onRefresh={fetchPlayer} />
      </div>

      {/* Page Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

// App with Providers
function App() {
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      uiPreferences={{ theme: "DARK" }}
    >
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#121212",
              color: "#fff",
              border: "1px solid rgba(57, 255, 20, 0.3)",
            },
          }}
        />
        <Routes>
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}

export default App;
