import pandas as pd
import numpy as np
import joblib
import pickle
from datetime import datetime
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error, classification_report
import warnings
warnings.filterwarnings('ignore')

class FloodModelSaver:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_generators = {}
        self.feature_names = {}
        self.model_dir = "saved_models"
        self.ensure_model_directory()
    
    def ensure_model_directory(self):
        """Create model directory if it doesn't exist"""
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
            print(f"Created directory: {self.model_dir}")
    
    def train_and_save_models(self, data_file='flood.csv'):
        """Train all models and save them"""
        print("Loading and preparing data...")
        df = pd.read_csv(data_file)
        
        # Prepare features and target
        X = df.drop('FloodProbability', axis=1)
        y = df['FloodProbability']
        
        # Store original feature names
        original_features = X.columns.tolist()
        
        # Create interaction features
        print("Creating enhanced features...")
        poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
        X_poly = poly.fit_transform(X)
        
        # Get feature names for polynomial features
        feature_names = poly.get_feature_names_out(original_features)
        X_enhanced = pd.DataFrame(X_poly, columns=feature_names)
        
        print(f"Enhanced features: {X_enhanced.shape[1]} features")
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X_enhanced, y, test_size=0.2, random_state=42
        )
        
        # Scale the features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train and save each model
        models_to_train = {
            'random_forest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'gradient_boosting': GradientBoostingRegressor(
                n_estimators=200,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            ),
            'neural_network': MLPRegressor(
                hidden_layer_sizes=(100, 50, 25),
                activation='relu',
                solver='adam',
                alpha=0.001,
                batch_size='auto',
                learning_rate='constant',
                learning_rate_init=0.001,
                max_iter=1000,
                random_state=42
            )
        }
        
        results = {}
        
        for name, model in models_to_train.items():
            print(f"\nTraining {name}...")
            
            # Train model
            if name == 'neural_network':
                model.fit(X_train_scaled, y_train)
                y_pred = model.predict(X_test_scaled)
            else:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
            
            # Evaluate
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            results[name] = {
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'model': model
            }
            
            print(f"  {name} - RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
            
            # Save the model
            self.save_model(model, scaler, poly, feature_names, name, {
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'original_features': original_features,
                'training_date': datetime.now().isoformat()
            })
        
        # Find best model
        best_model_name = max(results.keys(), key=lambda x: results[x]['r2'])
        print(f"\nBest Model: {best_model_name} (R² = {results[best_model_name]['r2']:.4f})")
        
        # Save best model with special name
        best_model = results[best_model_name]['model']
        self.save_model(best_model, scaler, poly, feature_names, 'best_model', {
            'model_type': best_model_name,
            'rmse': results[best_model_name]['rmse'],
            'mae': results[best_model_name]['mae'],
            'r2': results[best_model_name]['r2'],
            'original_features': original_features,
            'training_date': datetime.now().isoformat()
        })
        
        return results, best_model_name
    
    def save_model(self, model, scaler, feature_generator, feature_names, model_name, metadata):
        """Save model and all preprocessing components"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create model package
        model_package = {
            'model': model,
            'scaler': scaler,
            'feature_generator': feature_generator,
            'feature_names': feature_names,
            'metadata': metadata
        }
        
        # Save with joblib (better for sklearn models)
        filename = f"{self.model_dir}/{model_name}_{timestamp}.joblib"
        joblib.dump(model_package, filename)
        
        # Also save as pickle backup
        pickle_filename = f"{self.model_dir}/{model_name}_{timestamp}.pkl"
        with open(pickle_filename, 'wb') as f:
            pickle.dump(model_package, f)
        
        print(f"Model saved: {filename}")
        print(f"Backup saved: {pickle_filename}")
        
        # Save latest version without timestamp
        latest_filename = f"{self.model_dir}/{model_name}_latest.joblib"
        joblib.dump(model_package, latest_filename)
        print(f"Latest version: {latest_filename}")
    
    def load_model(self, model_name='best_model', use_latest=True):
        """Load a saved model"""
        if use_latest:
            filename = f"{self.model_dir}/{model_name}_latest.joblib"
        else:
            # List available models
            files = [f for f in os.listdir(self.model_dir) if f.startswith(model_name) and f.endswith('.joblib')]
            if not files:
                raise FileNotFoundError(f"No saved models found for {model_name}")
            
            # Get the most recent
            files.sort(reverse=True)
            filename = f"{self.model_dir}/{files[0]}"
        
        try:
            model_package = joblib.load(filename)
            print(f"Model loaded from: {filename}")
            
            # Print metadata
            if 'metadata' in model_package:
                print("\nModel Information:")
                for key, value in model_package['metadata'].items():
                    print(f"  {key}: {value}")
            
            return model_package
        
        except FileNotFoundError:
            print(f"Model file not found: {filename}")
            return None
    
    def predict_with_saved_model(self, input_data, model_name='best_model'):
        """Make predictions using a saved model"""
        model_package = self.load_model(model_name)
        
        if model_package is None:
            return None
        
        model = model_package['model']
        scaler = model_package['scaler']
        feature_generator = model_package['feature_generator']
        original_features = model_package['metadata']['original_features']
        
        # Prepare input data
        if isinstance(input_data, dict):
            input_df = pd.DataFrame([input_data])
        else:
            input_df = pd.DataFrame(input_data)
        
        # Ensure all required features are present
        for feature in original_features:
            if feature not in input_df.columns:
                raise ValueError(f"Missing required feature: {feature}")
        
        # Reorder columns to match training data
        input_df = input_df[original_features]
        
        # Generate polynomial features
        input_poly = feature_generator.transform(input_df)
        
        # Scale features (check if it's neural network)
        model_type = model_package['metadata'].get('model_type', 'unknown')
        if model_type == 'neural_network' or hasattr(model, 'hidden_layer_sizes'):
            input_scaled = scaler.transform(input_poly)
            prediction = model.predict(input_scaled)
        else:
            prediction = model.predict(input_poly)
        
        return prediction[0] if len(prediction) == 1 else prediction
    
    def list_saved_models(self):
        """List all saved models"""
        if not os.path.exists(self.model_dir):
            print("No saved models directory found.")
            return
        
        files = [f for f in os.listdir(self.model_dir) if f.endswith('.joblib')]
        
        if not files:
            print("No saved models found.")
            return
        
        print("\nSaved Models:")
        print("=" * 50)
        for file in sorted(files):
            print(f"  {file}")
        
        return files

# Example usage and testing
def main():
    # Initialize the model saver
    saver = FloodModelSaver()
    
    # Train and save all models
    print("Training and saving models...")
    results, best_model = saver.train_and_save_models()
    
    # List saved models
    saver.list_saved_models()
    
    # Test loading and prediction
    print("\n" + "="*60)
    print("TESTING SAVED MODEL")
    print("="*60)
    
    # Test prediction with saved model
    sample_data = {
        'MonsoonIntensity': 8,
        'TopographyDrainage': 5,
        'RiverManagement': 6,
        'Deforestation': 7,
        'Urbanization': 8,
        'ClimateChange': 9,
        'DamsQuality': 4,
        'Siltation': 6,
        'AgriculturalPractices': 5,
        'Encroachments': 7,
        'IneffectiveDisasterPreparedness': 8,
        'DrainageSystems': 3,
        'CoastalVulnerability': 6,
        'Landslides': 5,
        'Watersheds': 4,
        'DeterioratingInfrastructure': 7,
        'PopulationScore': 8,
        'WetlandLoss': 6,
        'InadequatePlanning': 7,
        'PoliticalFactors': 5
    }
    
    try:
        prediction = saver.predict_with_saved_model(sample_data)
        print(f"\nPrediction with saved model: {prediction:.3f}")
        
        # Risk categorization
        if prediction < 0.4:
            risk_level = "LOW"
        elif prediction < 0.6:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        print(f"Risk Level: {risk_level}")
        
    except Exception as e:
        print(f"Error making prediction: {e}")

if __name__ == "__main__":
    main()