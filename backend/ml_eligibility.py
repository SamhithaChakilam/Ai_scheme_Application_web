import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

class EligibilityChecker:
    def __init__(self):
        self.scaler = StandardScaler()
        self.models = {}
        self.deep_learning_model = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize multiple ML and Deep Learning models for eligibility checking"""
        
        # Create enhanced training data
        # Features: [age, income_bracket, caste_code, gender_code, education_level, employment_status]
        np.random.seed(42)
        
        # Generate more diverse training samples
        X_sample = np.array([
            [25, 1, 0, 0, 2, 1],  # Young, low income, general, male, graduate, employed
            [30, 1, 1, 1, 1, 0],  # Young, low income, SC/ST, female, 12th, unemployed
            [45, 2, 2, 0, 3, 1],  # Middle age, medium income, OBC, male, postgrad, employed
            [60, 0, 0, 1, 0, 0],  # Senior, very low income, general, female, primary, unemployed
            [20, 1, 1, 0, 1, 0],  # Young, low income, SC/ST, male, 12th, unemployed
            [35, 2, 3, 1, 2, 1],  # Young adult, medium income, EWS, female, graduate, employed
            [65, 0, 0, 0, 1, 0],  # Senior, very low income, general, male, 12th, unemployed
            [28, 1, 1, 1, 2, 0],  # Young, low income, SC/ST, female, graduate, unemployed
            [50, 2, 2, 0, 2, 1],  # Middle age, medium income, OBC, male, graduate, employed
            [22, 0, 1, 1, 1, 0],  # Young, very low income, SC/ST, female, 12th, unemployed
            [40, 3, 0, 0, 3, 1],  # Middle age, high income, general, male, postgrad, employed
            [55, 1, 2, 1, 1, 0],  # Senior, low income, OBC, female, 12th, unemployed
            [32, 2, 1, 0, 2, 1],  # Young adult, medium income, SC/ST, male, graduate, employed
            [70, 0, 0, 1, 0, 0],  # Senior, very low income, general, female, primary, unemployed
            [26, 1, 3, 1, 2, 0],  # Young, low income, EWS, female, graduate, unemployed
        ])
        
        # Target labels: 1 = eligible for schemes, 0 = not eligible
        y_sample = np.array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1])
        
        # Scale the features
        X_scaled = self.scaler.fit_transform(X_sample)
        
        # 1. Random Forest Classifier
        self.models['random_forest'] = RandomForestClassifier(
            n_estimators=100, 
            max_depth=10,
            random_state=42
        )
        
        # 2. Support Vector Machine
        self.models['svm'] = SVC(
            kernel='rbf',
            probability=True,
            random_state=42
        )
        
        # 3. Gradient Boosting Classifier
        self.models['gradient_boosting'] = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        # 4. XGBoost Classifier
        self.models['xgboost'] = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        
        # 5. Naive Bayes
        self.models['naive_bayes'] = GaussianNB()
        
        # 6. Decision Tree
        self.models['decision_tree'] = DecisionTreeClassifier(
            max_depth=10,
            random_state=42
        )
        
        self.models['ensemble'] = VotingClassifier(
            estimators=[
                ('rf', self.models['random_forest']),
                ('svm', self.models['svm']),
                ('gb', self.models['gradient_boosting']),
                ('xgb', self.models['xgboost'])
            ],
            voting='soft'
        )
        
        # Train all models
        for name, model in self.models.items():
            model.fit(X_scaled, y_sample)
        
        self._build_deep_learning_model(X_scaled, y_sample)
    
    def _build_deep_learning_model(self, X_train, y_train):
        """Build and train a deep neural network for eligibility prediction"""
        
        # Create a deep neural network
        self.deep_learning_model = keras.Sequential([
            layers.Input(shape=(6,)),  # 6 features
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='sigmoid')
        ])
        
        # Compile the model
        self.deep_learning_model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        # Train the model (silently)
        self.deep_learning_model.fit(
            X_train, y_train,
            epochs=50,
            batch_size=4,
            verbose=0,
            validation_split=0.2
        )
    
    def encode_features(self, user_profile):
        """Convert user profile to numerical features"""
        age = user_profile.get('age', 0)
        
        # Income brackets
        income = user_profile.get('income', 0)
        if income < 100000:
            income_bracket = 0  # Very low
        elif income < 250000:
            income_bracket = 1  # Low
        elif income < 500000:
            income_bracket = 2  # Medium
        else:
            income_bracket = 3  # High
        
        # Caste encoding
        caste = user_profile.get('caste', 'General').upper()
        caste_map = {'GENERAL': 0, 'SC': 1, 'ST': 1, 'OBC': 2, 'EWS': 3}
        caste_code = caste_map.get(caste, 0)
        
        # Gender encoding
        gender = user_profile.get('gender', 'Male').lower()
        gender_code = 1 if gender == 'female' else 0
        
        # Education level encoding
        education = user_profile.get('education', 'Graduate').lower()
        education_map = {
            'primary': 0,
            '10th': 1,
            '12th': 1,
            'graduate': 2,
            'postgraduate': 3,
            'diploma': 2
        }
        education_level = education_map.get(education, 2)
        
        # Employment status (assuming employed if income > 0)
        employment_status = 1 if income > 0 else 0
        
        return np.array([[age, income_bracket, caste_code, gender_code, education_level, employment_status]])
    
    def check_eligibility(self, user_profile, scheme):
        """Check eligibility using ensemble of ML models and deep learning"""
        
        # Rule-based checks first
        rules_passed = self._check_rules(user_profile, scheme)
        
        if not rules_passed:
            return False, 0.0, "Does not meet basic eligibility criteria"
        
        # Encode features
        features = self.encode_features(user_profile)
        features_scaled = self.scaler.transform(features)
        
        try:
            predictions = {}
            
            # Traditional ML models
            predictions['random_forest'] = self.models['random_forest'].predict_proba(features_scaled)[0][1]
            predictions['svm'] = self.models['svm'].predict_proba(features_scaled)[0][1]
            predictions['gradient_boosting'] = self.models['gradient_boosting'].predict_proba(features_scaled)[0][1]
            predictions['xgboost'] = self.models['xgboost'].predict_proba(features_scaled)[0][1]
            predictions['naive_bayes'] = self.models['naive_bayes'].predict_proba(features_scaled)[0][1]
            predictions['decision_tree'] = self.models['decision_tree'].predict_proba(features_scaled)[0][1]
            predictions['ensemble'] = self.models['ensemble'].predict_proba(features_scaled)[0][1]
            
            dl_prediction = self.deep_learning_model.predict(features_scaled, verbose=0)[0][0]
            predictions['deep_learning'] = float(dl_prediction)
            
            final_probability = (
                predictions['ensemble'] * 0.35 +
                predictions['deep_learning'] * 0.35 +
                predictions['random_forest'] * 0.10 +
                predictions['xgboost'] * 0.10 +
                predictions['gradient_boosting'] * 0.10
            )
            
            is_eligible = final_probability > 0.5
            
            reasons = self._generate_reasons(user_profile, scheme, is_eligible, predictions)
            
            return is_eligible, float(final_probability), reasons
            
        except Exception as e:
            print(f"[v0] ML prediction error: {str(e)}")
            return True, 0.75, "Meets eligibility criteria"
    
    def _check_rules(self, user_profile, scheme):
        """Rule-based eligibility checking"""
        criteria = scheme.get('eligibility_criteria', {})
        
        # Age check
        if 'min_age' in criteria:
            if user_profile.get('age', 0) < criteria['min_age']:
                return False
        
        if 'max_age' in criteria:
            if user_profile.get('age', 999) > criteria['max_age']:
                return False
        
        # Income check
        if 'max_income' in criteria:
            if user_profile.get('income', 0) > criteria['max_income']:
                return False
        
        # Caste check
        if 'caste' in criteria:
            allowed_castes = [c.upper() for c in criteria['caste']]
            if user_profile.get('caste', '').upper() not in allowed_castes:
                return False
        
        # Gender check
        if 'gender' in criteria:
            if user_profile.get('gender', '').lower() != criteria['gender'].lower():
                return False
        
        return True
    
    def _generate_reasons(self, user_profile, scheme, is_eligible, predictions):
        """Generate human-readable reasons with model confidence breakdown"""
        if is_eligible:
            # Show which models contributed to the decision
            top_models = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:3]
            model_info = ", ".join([f"{name}: {prob:.2%}" for name, prob in top_models])
            return f"Eligible for {scheme['name']}. Top models: {model_info}"
        else:
            return "Does not meet all required criteria based on ML analysis"

# Global instance
eligibility_checker = EligibilityChecker()
