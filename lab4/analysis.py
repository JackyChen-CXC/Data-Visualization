import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import MDS
from sklearn.cluster import KMeans
import json
import matplotlib.pyplot as plt

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

    corr_matrix = num.corr()

    # From ChatGPT on how to find the optimal K
    def find_distortions(data, max_k=10):
        distortions = []
        for k in range(1, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=42)
            kmeans.fit(data)
            distortions.append(kmeans.inertia_)
        return distortions
    
    # Ran through mutiple iterations of finding the optimal k until I found a value I was satified with
    def find_optimal_k_using_second_derivative(distortions):
        differences = np.diff(distortions)
        second_differences = np.diff(differences)
        for i in range(1, len(second_differences)):
            if second_differences[i] > 0:
                return i + 2  
        return len(distortions)
        
    scaled_data = StandardScaler().fit_transform(num)

    # K-Means Clustering

    distortions = find_distortions(scaled_data)
    optimal_k = find_optimal_k_using_second_derivative(distortions)
    kmeans = KMeans(n_clusters=optimal_k, random_state=42)
    cluster_num = kmeans.fit_predict(scaled_data)

    # Parallel Coordinates

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

    # Standardize the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(num)

    # PCA
    pca = PCA()
    pca_result = pca.fit_transform(scaled_data)
    
    # PCA biplot (top 2 PCA vectors)
    loadings = pca.components_.T[:, :2]
    
    # MDS display of the data
    mds = MDS(n_components=2, random_state=42)
    mds_data = mds.fit_transform(scaled_data)
        
    # save all results to JSON files
    
    # Parallel Coordinates 8 numerial, 2 catagorical 
    parallel_results = {
        'data': parallel_values.to_dict('records'),
        'cata': cata.to_dict('records'),
        'corr': parallel_corr.to_dict('records'),
        'column_names': parallel_order,
    }
    with open('parallel_coordinates_data.json', 'w') as f:
        json.dump(parallel_results, f)
    
    # PCA biplot (top 2 PCA vectors)
    biplot_results = {
        'pca_coords': pca_result[:, :2].tolist(),
        'loadings': loadings.tolist(),
        'column_names': num.columns.tolist()
    }
    with open('biplot_data.json', 'w') as f:
        json.dump(biplot_results, f)
    
    # MDS display of the data
    mds_data_results = {
        'mds_data': mds_data.tolist()
    }
    with open('mds_data.json', 'w') as f:
        json.dump(mds_data_results, f)
    
    # K-Means Clustering data
    cluster_results = {
        'k': optimal_k,
        'data': cluster_num.tolist(),
    }
    with open('cluster_data.json', 'w') as f:
        json.dump(cluster_results, f)


# Wasn't sure how to organize the axes for 4 - Parallel Coordinates
# Code taken from ChatGPT for the use of deciding the top pairs of variables for the order of numerical axes
def find_sequential_pairs(corr_matrix, n_pairs=12):
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