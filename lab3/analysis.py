import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import MDS
import json

def preprocess_data(file_path):
    
    # load data
    df = pd.read_csv(file_path)
    
    # Organize Data
    numericals = ["Age", "Weight (kg)", "Height (m)", "Max_BPM", "Avg_BPM", "Resting_BPM", "Session_Duration (hours)", "Calories_Burned", 
                  "Fat_Percentage", "Water_Intake (liters)", "Workout_Frequency (days/week)", "Experience_Level", "BMI"]
    catagories = ["Gender", "Workout_Type"]
    
    # Numerical Data
    num = df[numericals]
    # Catagorical Data
    cata = df[catagories]

    # Correlation Matrix
    corr_matrix = num.corr()

    # Greatest Correlations
    corr_sums = np.abs(corr_matrix).sum()

    # 1 - 8x8 Correlation Matrix
    corr_8_indexes = corr_sums.nlargest(8).index.tolist()
    corr_8 = corr_matrix[corr_8_indexes].loc[corr_8_indexes]

    # 2 - 7x7 Scatter Plot Matrix
    scatt_indexes = corr_sums.nlargest(5).index.tolist()
    
    # Numerical + Catagorical
    scatt_indexes.extend(catagories)
    scatt_values = df[scatt_indexes]

    # 3 - Parallel Coordinates

    # select the top 8 Numerical variables
    pairings = find_sequential_pairs(corr_matrix)
    parallel_order = list(map(lambda x: x[0], pairings))

    # get final Numerical variable
    parallel_order.append(pairings[len(pairings)-1][1])
    
    # correlation values work only with Numerical variables
    parallel_corr = corr_matrix[parallel_order].loc[parallel_order]
    parallel_values = df[parallel_order]

    # 2 extra Catagorial variables (add correlation)
    parallel_order.extend(catagories)

    # 4 - PCA plot with scree plot

    # Standardize the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(num)

    # PCA
    pca = PCA()
    pca_result = pca.fit_transform(scaled_data)
    
    # scree plot
    explained_variance = pca.explained_variance_ratio_
    
    # 5 - PCA biplot (top 2 PCA vectors)
    loadings = pca.components_.T[:, :2]
    
    # 6 - MDS display of the data
    mds = MDS(n_components=2, random_state=42)
    mds_data = mds.fit_transform(scaled_data)
    
    # 7 - MDS display of the attributes 
    corr_distance = 1 - np.abs(corr_matrix)
    mds_attr = MDS(n_components=2, dissimilarity='precomputed', random_state=42)
    mds_attr_coords = mds_attr.fit_transform(corr_distance)
    
    # save all results to JSON files

    # 1- 8x8 Correlation Matrix
    corr_results = {
        'correlation': corr_8.to_dict('records'),
        'column_names': corr_8.columns.tolist()
    }
    with open('correlation_data.json', 'w') as f:
        json.dump(corr_results, f)

    # 2 - 7x7 Scatter Plot Matrix
    scatt_results = {
        'data': scatt_values.to_dict('records'),
        'column_names': scatt_indexes,
    }
    with open('scatterplot_data.json', 'w') as f:
        json.dump(scatt_results, f)
    
    # 3 - Parallel Coordinates 8 numerial, 2 catagorical 
    parallel_results = {
        'data': parallel_values.to_dict('records'),
        'cata': cata.to_dict('records'),
        'corr': parallel_corr.to_dict('records'),
        'column_names': parallel_order,
    }
    with open('parallel_coordinates_data.json', 'w') as f:
        json.dump(parallel_results, f)
    
    # 4 - PCA plot with scree plot
    pca_plot_results = {
        'pca_coords': pca_result[:, :2].tolist(),
        'explained_variance': explained_variance.tolist()
    }
    with open('pca_plot_data.json', 'w') as f:
        json.dump(pca_plot_results, f)

    # 5 - PCA biplot (top 2 PCA vectors)
    biplot_results = {
        'pca_coords': pca_result[:, :2].tolist(),
        'loadings': loadings.tolist(),
        'column_names': num.columns.tolist()
    }
    with open('biplot_data.json', 'w') as f:
        json.dump(biplot_results, f)
    
    # 6 - MDS display of the data
    mds_data_results = {
        'mds_data': mds_data.tolist()
    }
    with open('mds_data.json', 'w') as f:
        json.dump(mds_data_results, f)

    # 7 - MDS display of the attributes 
    mds_attr_results = {
        'mds_attributes': mds_attr_coords.tolist(),
        'column_names': num.columns.tolist()
    }
    with open('mds_attr.json', 'w') as f:
        json.dump(mds_attr_results, f)

# Wasn't sure how to organize the axes for 4 - Parallel Coordinates
# Code taken from ChatGPT for the use of deciding the top pairs of variables for the order of numerical axes
def find_sequential_pairs(corr_matrix, n_pairs=7):
    # Set the diagonal (self-correlations) to zero to ignore them
    abs_corr_matrix = corr_matrix.abs().copy()
    np.fill_diagonal(abs_corr_matrix.values, 0)

    # Create a list to store the selected pairs
    pairs = []

    # Find the first feature with the highest sum of correlations
    selected_features = []
    feature = abs_corr_matrix.sum().idxmax()  # Start with the feature with the highest correlation sum
    selected_features.append(feature)

    for _ in range(n_pairs):
        # Find the feature with the highest absolute correlation to the last selected feature
        last_feature = selected_features[-1]
        next_feature = abs_corr_matrix[last_feature].drop(selected_features).idxmax()
        pairs.append((last_feature, next_feature))
        selected_features.append(next_feature)

    return pairs

if __name__ == "__main__":
    # data set: https://www.kaggle.com/datasets/valakhorasani/gym-members-exercise-dataset
    preprocess_data('gym_members_exercise_tracking.csv')