import matplotlib.pyplot as plt
import numpy as np

# Set seed for reproducibility
np.random.seed(42)

# Create 10 epochs
epochs = np.arange(1, 11)

# Generate accuracy with realistic fluctuations
accuracy = [0.70]  # start at 70%
for _ in range(1, 10):
    # Add a small positive trend with random fluctuation
    change = np.random.uniform(-0.005, 0.025)  # can go slightly down or mostly up
    new_accuracy = min(max(accuracy[-1] + change, 0.6), 0.91)  # keep within bounds
    accuracy.append(new_accuracy)

# Convert to NumPy array for plotting
accuracy = np.array(accuracy)

# Plotting
plt.figure(figsize=(8, 5))
plt.plot(epochs, accuracy, marker='o', color='blue', label='Accuracy')
plt.axhline(y=0.91, color='green', linestyle='--', label='Target Accuracy (91%)')

# Labeling
plt.title('Model Accuracy Over Epochs')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.ylim(0.6, 1.0)
plt.grid(True)
plt.legend()

# Show plot
plt.tight_layout()
plt.show()
