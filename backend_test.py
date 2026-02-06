import requests
import sys
from datetime import datetime
import json

class CanabisEmpireAPITester:
    def __init__(self, base_url="https://ton-connect-storage.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_wallet = "UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR"
        self.player_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {test_name}"
        if details:
            result += f" | {details}"
        
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        return success

    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                details += f" | Response: {response.json().get('message', 'N/A')}"
            return self.log_result("API Health Check", success, details)
        except Exception as e:
            return self.log_result("API Health Check", False, f"Error: {str(e)}")

    def test_get_config(self):
        """Test game configuration endpoint"""
        try:
            response = requests.get(f"{self.api_url}/config", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                config = response.json()
                details += f" | Has crops: {'crops' in config} | Has shop: {'shop_items' in config}"
            return self.log_result("Get Game Config", success, details)
        except Exception as e:
            return self.log_result("Get Game Config", False, f"Error: {str(e)}")

    def test_create_player(self):
        """Test player creation"""
        try:
            payload = {
                "wallet_address": self.test_wallet,
                "username": f"TestPlayer_{datetime.now().strftime('%H%M%S')}"
            }
            response = requests.post(f"{self.api_url}/player", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                player = response.json()
                self.player_id = player.get('id')
                details += f" | Player ID: {self.player_id} | Coins: {player.get('coins', 0)}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Create Player", success, details)
        except Exception as e:
            return self.log_result("Create Player", False, f"Error: {str(e)}")

    def test_get_player(self):
        """Test get player by wallet address"""
        try:
            response = requests.get(f"{self.api_url}/player/{self.test_wallet}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                player = response.json()
                if not self.player_id:
                    self.player_id = player.get('id')
                details += f" | Level: {player.get('level', 0)} | Energy: {player.get('energy', 0)}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Player", success, details)
        except Exception as e:
            return self.log_result("Get Player", False, f"Error: {str(e)}")

    def test_get_garden(self):
        """Test garden endpoint"""
        if not self.player_id:
            return self.log_result("Get Garden", False, "No player ID available")
        
        try:
            response = requests.get(f"{self.api_url}/garden/{self.player_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                garden = response.json()
                plots = garden.get('plots', [])
                unlocked_plots = sum(1 for p in plots if p.get('unlocked', False))
                details += f" | Total plots: {len(plots)} | Unlocked: {unlocked_plots}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Garden", success, details)
        except Exception as e:
            return self.log_result("Get Garden", False, f"Error: {str(e)}")

    def test_plant_crop(self):
        """Test planting a crop"""
        if not self.player_id:
            return self.log_result("Plant Crop", False, "No player ID available")
        
        try:
            payload = {
                "player_id": self.player_id,
                "slot": 0,  # First slot should be unlocked
                "crop_type": "cannabis_basic"  # Cheapest crop
            }
            response = requests.post(f"{self.api_url}/garden/plant", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                result = response.json()
                details += f" | Success: {result.get('success', False)} | Message: {result.get('message', 'N/A')}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Plant Crop", success, details)
        except Exception as e:
            return self.log_result("Plant Crop", False, f"Error: {str(e)}")

    def test_get_shop(self):
        """Test shop endpoint"""
        try:
            response = requests.get(f"{self.api_url}/shop", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                shop = response.json()
                boosts = len(shop.get('boosts', []))
                premium = len(shop.get('premium', []))
                cosmetics = len(shop.get('cosmetics', []))
                nfts = len(shop.get('nfts', []))
                details += f" | Boosts: {boosts} | Premium: {premium} | Cosmetics: {cosmetics} | NFTs: {nfts}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Shop", success, details)
        except Exception as e:
            return self.log_result("Get Shop", False, f"Error: {str(e)}")

    def test_get_staking(self):
        """Test staking info endpoint"""
        if not self.player_id:
            return self.log_result("Get Staking Info", False, "No player ID available")
        
        try:
            response = requests.get(f"{self.api_url}/staking/{self.player_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                staking = response.json()
                details += f" | Staked: {staking.get('staked_amount', 0)} | Available: {staking.get('available_gleaf', 0)}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Staking Info", success, details)
        except Exception as e:
            return self.log_result("Get Staking Info", False, f"Error: {str(e)}")

    def test_daily_rewards(self):
        """Test daily rewards endpoint"""
        if not self.player_id:
            return self.log_result("Daily Rewards", False, "No player ID available")
        
        try:
            payload = {"player_id": self.player_id}
            response = requests.post(f"{self.api_url}/rewards/daily", json=payload, timeout=10)
            # This might fail if already claimed today, which is OK
            success = response.status_code in [200, 400]  # 400 for already claimed is acceptable
            details = f"Status: {response.status_code}"
            
            if response.status_code == 200:
                result = response.json()
                details += f" | Streak: {result.get('streak', 0)}"
            elif response.status_code == 400:
                details += " | Already claimed today (OK)"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Daily Rewards", success, details)
        except Exception as e:
            return self.log_result("Daily Rewards", False, f"Error: {str(e)}")

    def test_referrals(self):
        """Test referral system"""
        if not self.player_id:
            return self.log_result("Get Referrals", False, "No player ID available")
        
        try:
            response = requests.get(f"{self.api_url}/referrals/{self.player_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                referrals = response.json()
                details += f" | Code: {referrals.get('referral_code', 'N/A')} | Count: {referrals.get('referral_count', 0)}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Referrals", success, details)
        except Exception as e:
            return self.log_result("Get Referrals", False, f"Error: {str(e)}")

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        try:
            response = requests.get(f"{self.api_url}/leaderboard", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                leaderboard = response.json()
                details += f" | Entries: {len(leaderboard)}"
            else:
                details += f" | Error: {response.text}"
                
            return self.log_result("Get Leaderboard", success, details)
        except Exception as e:
            return self.log_result("Get Leaderboard", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Cannabis Empire Backend API Tests")
        print(f"Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        if not self.test_api_health():
            print("\n❌ API not accessible, stopping tests")
            return False
        
        self.test_get_config()
        
        # Player management tests
        self.test_create_player()  # This will either create or get existing
        self.test_get_player()
        
        # Game feature tests  
        self.test_get_garden()
        self.test_plant_crop()
        self.test_get_shop()
        self.test_get_staking()
        self.test_daily_rewards()
        self.test_referrals()
        self.test_leaderboard()
        
        # Results summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CanabisEmpireAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())