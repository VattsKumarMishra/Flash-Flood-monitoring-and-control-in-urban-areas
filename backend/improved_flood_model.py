import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.preprocessing import PolynomialFeatures
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

class ImprovedFloodPredictionModel:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.feature_names = None
        self.best_model = None
        self.best_model_name = None
        
    def load_data(self, file_path):
        """Load and prepare the flood dataset"""
        self.df = pd.read_csv(file_path)
        print(f"Dataset loaded: {self.df.shape}")
        return self.df
    
    def create_feature_interactions(self, X):
        """Create interaction features for better model performance"""
        # Create some meaningful interaction features
        X_enhanced = X.copy()
        
        # Environmental stress interaction
        X_enhanced['Environmental_Stress'] = (
            X['MonsoonIntensity'] * X['ClimateChange'] * X['Deforestation']
        )
        
        # Infrastructure vulnerability
        X_enhanced['Infrastructure_Risk'] = (
            X['DeterioratingInfrastructure'] * X['DrainageSystems'] * X['DamsQuality']
        )
        
        # Urban pressure
        X_enhanced['Urban_Pressure'] = (
            X['Urbanization'] * X['PopulationScore'] * X['Encroachments']
        )
        
        # Water management efficiency
        X_enhanced['Water_Management'] = (
            X['RiverManagement'] * X['DrainageSystems'] * X['Watersheds']
        )
        
        # Natural vulnerability
        X_enhanced['Natural_Vulnerability'] = (
            X['TopographyDrainage'] * X['CoastalVulnerability'] * X['Landslides']
        )
        
        return X_enhanced
    
    def prepare_data(self, use_feature_engineering=True):
        """Prepare features and target for training"""
        # Separate features and target
        X = self.df.drop('FloodProbability', axis=1)
        y = self.df['FloodProbability']
        
        # Apply feature engineering if requested
        if use_feature_engineering:
            X = self.create_feature_interactions(X)
            print(f"Enhanced features: {X.shape[1]} features (added interaction terms)")
        
        self.feature_names = X.columns.tolist()
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=pd.cut(y, bins=5)
        )
        
        # Scale the features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        return X_train_scaled, X_test_scaled, y_train, y_test, X_train, X_test
    
    def train_multiple_models(self, X_train, y_train):
        """Train multiple models and compare performance"""
        print("Training multiple models...")
        
        # Define models to try
        models_to_try = {
            'Random Forest (Tuned)': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=150,
                learning_rate=0.1,
                max_depth=8,
                random_state=42
            ),
            'Neural Network': MLPRegressor(
                hidden_layer_sizes=(100, 50, 25),
                learning_rate_init=0.001,
                max_iter=500,
                random_state=42,
                early_stopping=True
            )
        }
        
        # Train each model and get cross-validation scores
        cv_scores = {}
        for name, model in models_to_try.items():
            print(f"Training {name}...")
            
            # Cross-validation
            cv_score = cross_val_score(model, X_train, y_train, cv=5, scoring='r2').mean()
            cv_scores[name] = cv_score
            
            # Train on full training set
            model.fit(X_train, y_train)
            self.models[name] = model
            
            print(f"  {name} CV R² Score: {cv_score:.4f}")
        
        # Select best model based on CV score
        self.best_model_name = max(cv_scores, key=cv_scores.get)
        self.best_model = self.models[self.best_model_name]
        
        print(f"\nBest Model: {self.best_model_name}")
        return cv_scores
    
    def evaluate_all_models(self, X_test, y_test):
        """Evaluate all trained models"""
        results = {}
        
        print("\n=== Model Comparison ===")
        print(f"{'Model':<25} {'RMSE':<8} {'MAE':<8} {'R²':<8}")
        print("-" * 50)
        
        for name, model in self.models.items():
            y_pred = model.predict(X_test)
            
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            results[name] = {
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'predictions': y_pred
            }
            
            print(f"{name:<25} {rmse:<8.4f} {mae:<8.4f} {r2:<8.4f}")
        
        return results
    
    def get_feature_importance(self, top_n=15):
        """Get feature importance from the best model"""
        if self.best_model is None:
            print("No model trained yet!")
            return None
        
        # Only tree-based models have feature_importances_
        if hasattr(self.best_model, 'feature_importances_'):
            importance = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.best_model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print(f"\n=== Top {top_n} Most Important Features ({self.best_model_name}) ===")
            print(importance.head(top_n))
            
            return importance
        else:
            print(f"Feature importance not available for {self.best_model_name}")
            return None
    
    def analyze_predictions(self, y_test, results):
        """Analyze prediction quality across different risk levels"""
        best_results = results[self.best_model_name]
        y_pred = best_results['predictions']
        
        # Create risk categories
        def categorize_risk(prob):
            if prob < 0.4:
                return 'Low'
            elif prob < 0.6:
                return 'Medium'
            else:
                return 'High'
        
        # Categorize actual and predicted values
        actual_categories = [categorize_risk(p) for p in y_test]
        pred_categories = [categorize_risk(p) for p in y_pred]
        
        # Create confusion matrix for risk categories
        from sklearn.metrics import classification_report
        
        print(f"\n=== Risk Level Classification Report ({self.best_model_name}) ===")
        print(classification_report(actual_categories, pred_categories))
        
        # Calculate accuracy by risk level
        risk_accuracy = {}
        for risk in ['Low', 'Medium', 'High']:
            mask = [cat == risk for cat in actual_categories]
            if sum(mask) > 0:
                correct = sum([actual_categories[i] == pred_categories[i] for i in range(len(mask)) if mask[i]])
                risk_accuracy[risk] = correct / sum(mask)
        
        print(f"\nRisk Level Accuracy:")
        for risk, acc in risk_accuracy.items():
            print(f"  {risk} Risk: {acc:.2%}")
        
        return risk_accuracy
    
    def predict_flood_risk(self, input_data):
        """Predict flood probability for new data using the best model"""
        if self.best_model is None:
            print("No model trained yet!")
            return None
        
        # Ensure input_data is in the correct format
        if isinstance(input_data, dict):
            input_df = pd.DataFrame([input_data])
        else:
            input_df = pd.DataFrame(input_data)
        
        # Apply same feature engineering
        input_enhanced = self.create_feature_interactions(input_df)
        
        # Handle missing columns (if any)
        for col in self.feature_names:
            if col not in input_enhanced.columns:
                input_enhanced[col] = 0
        
        # Reorder columns to match training data
        input_enhanced = input_enhanced[self.feature_names]
        
        # Scale the input
        input_scaled = self.scaler.transform(input_enhanced)
        
        # Make prediction
        prediction = self.best_model.predict(input_scaled)
        
        return prediction[0] if len(prediction) == 1 else prediction

# Example usage
def main():
    # Initialize the improved model
    flood_model = ImprovedFloodPredictionModel()
    
    # Load data
    df = flood_model.load_data('flood.csv')
    
    # Prepare data with feature engineering
    X_train, X_test, y_train, y_test, X_train_orig, X_test_orig = flood_model.prepare_data(use_feature_engineering=True)
    
    # Train multiple models
    cv_scores = flood_model.train_multiple_models(X_train, y_train)
    
    # Evaluate all models
    results = flood_model.evaluate_all_models(X_test, y_test)
    
    # Get feature importance for best model
    importance = flood_model.get_feature_importance()
    
    # Analyze predictions by risk level
    risk_accuracy = flood_model.analyze_predictions(y_test, results)
    
    # Example prediction
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
    
    prediction = flood_model.predict_flood_risk(sample_data)
    print(f"\n=== Sample Prediction (Best Model: {flood_model.best_model_name}) ===")
    print(f"Predicted Flood Probability: {prediction:.3f}")
    
    # Risk categorization
    if prediction < 0.4:
        risk_level = "LOW"
    elif prediction < 0.6:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"
    
    print(f"Risk Level: {risk_level}")

if __name__ == "__main__":
    main()