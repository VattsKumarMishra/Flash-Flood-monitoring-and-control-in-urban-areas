import joblib
import pandas as pd
import numpy as np
import os

class FloodPredictor:
    """Simple class to load and use saved flood prediction models"""
    
    def __init__(self, model_path=None):
        self.model_package = None
        self.model_dir = "saved_models"
        
        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path=None):
        """Load a saved model"""
        if model_path is None:
            # Try to load the best model
            model_path = f"{self.model_dir}/best_model_latest.joblib"
        
        try:
            self.model_package = joblib.load(model_path)
            print(f"✅ Model loaded successfully from: {model_path}")
            
            # Display model info
            if 'metadata' in self.model_package:
                metadata = self.model_package['metadata']
                print(f"\n📊 Model Information:")
                print(f"   Model Type: {metadata.get('model_type', 'Unknown')}")
                print(f"   R² Score: {metadata.get('r2', 'N/A'):.4f}")
                print(f"   RMSE: {metadata.get('rmse', 'N/A'):.4f}")
                print(f"   Training Date: {metadata.get('training_date', 'N/A')}")
            
            return True
            
        except FileNotFoundError:
            print(f"❌ Model file not found: {model_path}")
            return False
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
    
    def predict(self, input_data):
        """Make flood probability prediction"""
        if self.model_package is None:
            print("❌ No model loaded. Please load a model first.")
            return None
        
        try:
            model = self.model_package['model']
            scaler = self.model_package['scaler']
            feature_generator = self.model_package['feature_generator']
            original_features = self.model_package['metadata']['original_features']
            
            # Prepare input data
            if isinstance(input_data, dict):
                input_df = pd.DataFrame([input_data])
            else:
                input_df = pd.DataFrame(input_data)
            
            # Validate input features
            missing_features = [f for f in original_features if f not in input_df.columns]
            if missing_features:
                print(f"❌ Missing required features: {missing_features}")
                return None
            
            # Reorder columns to match training data
            input_df = input_df[original_features]
            
            # Generate polynomial features
            input_poly = feature_generator.transform(input_df)
            
            # Check if neural network (needs scaling)
            model_type = self.model_package['metadata'].get('model_type', 'unknown')
            if model_type == 'neural_network' or hasattr(model, 'hidden_layer_sizes'):
                input_scaled = scaler.transform(input_poly)
                prediction = model.predict(input_scaled)
            else:
                prediction = model.predict(input_poly)
            
            return prediction[0] if len(prediction) == 1 else prediction
            
        except Exception as e:
            print(f"❌ Error making prediction: {e}")
            return None
    
    def predict_risk_level(self, input_data):
        """Predict flood probability and return risk level"""
        probability = self.predict(input_data)
        
        if probability is None:
            return None, None
        
        # Categorize risk level
        if probability < 0.4:
            risk_level = "LOW"
            risk_emoji = "🟢"
        elif probability < 0.6:
            risk_level = "MEDIUM"
            risk_emoji = "🟡"
        else:
            risk_level = "HIGH"
            risk_emoji = "🔴"
        
        return probability, f"{risk_emoji} {risk_level}"
    
    def list_available_models(self):
        """List all available saved models"""
        if not os.path.exists(self.model_dir):
            print("No saved models directory found.")
            return []
        
        files = [f for f in os.listdir(self.model_dir) if f.endswith('.joblib')]
        
        if not files:
            print("No saved models found.")
            return []
        
        print("\n📁 Available Models:")
        print("=" * 50)
        for i, file in enumerate(sorted(files), 1):
            print(f"  {i}. {file}")
        
        return files

# Example usage functions
def quick_prediction():
    """Quick example of making a prediction"""
    # Initialize predictor
    predictor = FloodPredictor()
    
    # Sample flood risk data
    sample_area = {
        'MonsoonIntensity': 8,           # High monsoon intensity
        'TopographyDrainage': 3,         # Poor drainage
        'RiverManagement': 4,            # Moderate river management
        'Deforestation': 9,              # High deforestation
        'Urbanization': 8,               # High urbanization
        'ClimateChange': 7,              # Significant climate change impact
        'DamsQuality': 3,                # Poor dam quality
        'Siltation': 8,                  # High siltation
        'AgriculturalPractices': 5,      # Moderate agricultural practices
        'Encroachments': 7,              # High encroachments
        'IneffectiveDisasterPreparedness': 9,  # Poor disaster preparedness
        'DrainageSystems': 2,            # Very poor drainage systems
        'CoastalVulnerability': 6,       # Moderate coastal vulnerability
        'Landslides': 7,                 # High landslide risk
        'Watersheds': 4,                 # Poor watershed management
        'DeterioratingInfrastructure': 8, # Deteriorating infrastructure
        'PopulationScore': 9,            # High population density
        'WetlandLoss': 8,                # High wetland loss
        'InadequatePlanning': 9,         # Poor planning
        'PoliticalFactors': 6            # Moderate political factors
    }
    
    # Make prediction
    probability, risk_level = predictor.predict_risk_level(sample_area)
    
    if probability is not None:
        print(f"\n🌊 Flood Risk Assessment:")
        print(f"   Probability: {probability:.3f} ({probability*100:.1f}%)")
        print(f"   Risk Level: {risk_level}")
        
        # Additional insights
        if probability > 0.7:
            print("   ⚠️  CRITICAL: Immediate flood prevention measures recommended!")
        elif probability > 0.5:
            print("   ⚠️  WARNING: Enhanced monitoring and preparedness advised.")
        else:
            print("   ✅ SAFE: Low flood risk, maintain standard monitoring.")
    
    return probability, risk_level

def interactive_prediction():
    """Interactive prediction tool"""
    predictor = FloodPredictor()
    
    if predictor.model_package is None:
        print("❌ Could not load model. Please ensure model is saved first.")
        return
    
    print("\n🌊 Interactive Flood Risk Assessment Tool")
    print("=" * 50)
    print("Please enter values for each factor (0-16 scale):")
    
    # Get original feature names
    features = predictor.model_package['metadata']['original_features']
    
    input_data = {}
    
    try:
        for feature in features:
            while True:
                try:
                    value = input(f"{feature}: ")
                    value = float(value)
                    if 0 <= value <= 16:
                        input_data[feature] = value
                        break
                    else:
                        print("Please enter a value between 0 and 16")
                except ValueError:
                    print("Please enter a valid number")
                except KeyboardInterrupt:
                    print("\n\nAssessment cancelled.")
                    return
        
        # Make prediction
        probability, risk_level = predictor.predict_risk_level(input_data)
        
        if probability is not None:
            print(f"\n🌊 Flood Risk Assessment Result:")
            print(f"   Probability: {probability:.3f} ({probability*100:.1f}%)")
            print(f"   Risk Level: {risk_level}")
        
    except KeyboardInterrupt:
        print("\n\nAssessment cancelled.")

if __name__ == "__main__":
    print("🌊 Flood Prediction Model - Quick Test")
    print("=" * 50)
    
    # Run quick prediction
    quick_prediction()
    
    # Uncomment the line below to run interactive mode
    # interactive_prediction()