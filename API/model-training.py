import torch
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader, Dataset
from sklearn.model_selection import train_test_split
import logging
from typing import List, Tuple
import os

class AnswerEvaluationDataset(Dataset):
    def __init__(self, examples: List[InputExample]):
        self.examples = examples

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, idx: int) -> InputExample:
        return self.examples[idx]

class AnswerEvaluationModel:
    def __init__(
        self,
        base_model: str = 'all-MiniLM-L6-v2',
        device: str = None,
        batch_size: int = 16,
        epochs: int = 5
    ):
        self.base_model = base_model
        self.batch_size = batch_size
        self.epochs = epochs
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Disable other loggers
        logging.getLogger("transformers").setLevel(logging.ERROR)
        logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

    def prepare_data(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2
    ) -> Tuple[List[InputExample], List[InputExample]]:
        """Prepare training and validation datasets."""
        examples = []
        
        for idx, row in df.iterrows():
            try:
                # Convert to string and handle NaN values
                anchor = str(row['Anchor']).strip() if pd.notna(row['Anchor']) else ""
                positive = str(row['Positive']).strip() if pd.notna(row['Positive']) else ""
                negative = str(row['Negative']).strip() if pd.notna(row['Negative']) else ""

                if anchor and positive and negative:
                    example = InputExample(texts=[anchor, positive, negative])
                    examples.append(example)
                    
            except Exception as e:
                self.logger.warning(f"Skipping row {idx} due to error: {str(e)}")

        if not examples:
            raise ValueError("No valid examples found in the dataset")

        # Split into training and validation sets
        train_examples, val_examples = train_test_split(
            examples,
            test_size=test_size,
            random_state=42
        )

        self.logger.info(f"Created {len(train_examples)} training and {len(val_examples)} validation examples")
        return train_examples, val_examples

    def train(self, train_examples: List[InputExample], val_examples: List[InputExample]):
        """Train the model with validation."""
        self.model = SentenceTransformer(self.base_model)
        self.model.to(self.device)

        # Create data loaders
        train_dataset = AnswerEvaluationDataset(train_examples)
        val_dataset = AnswerEvaluationDataset(val_examples)

        train_dataloader = DataLoader(
            train_dataset,
            shuffle=True,
            batch_size=self.batch_size,
            drop_last=False
        )

        val_dataloader = DataLoader(
            val_dataset,
            shuffle=False,
            batch_size=self.batch_size
        )

        # Define loss with distance metric
        train_loss = losses.TripletLoss(
            model=self.model,
            distance_metric=losses.TripletDistanceMetric.COSINE,
            triplet_margin=0.5
        )

        # Train with validation
        self.model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            evaluator=None,  # Custom evaluator could be added here
            epochs=self.epochs,
            warmup_steps=100,
            show_progress_bar=True,
            output_path='answer_evaluation_model'
        )

        # Save the trained model as 'triplet1'
        self.model.save('triplet1')
        self.logger.info("Model saved as 'triplet1'")

    def evaluate_answer(self, question: str, student_answer: str, correct_answer: str) -> float:
        """
        Evaluate a student's answer and return a confidence score (0-100).
        """
        if not self.model:
            raise ValueError("Model not trained. Please train the model first.")

        # Encode all texts
        with torch.no_grad():
            embeddings = self.model.encode(
                [question, student_answer, correct_answer],
                convert_to_tensor=True,
                show_progress_bar=False
            )
            
        # Calculate cosine similarity between student answer and correct answer
        cos_sim = torch.nn.functional.cosine_similarity(
            embeddings[1].unsqueeze(0),
            embeddings[2].unsqueeze(0)
        )
        
        # Convert to percentage (0-100)
        confidence = float(cos_sim * 100)
        
        # Clip to ensure we stay within 0-100 range
        confidence = max(0, min(100, confidence))
        
        return confidence

def main():
    try:
        # Initialize model
        evaluator = AnswerEvaluationModel(
            base_model='all-MiniLM-L6-v2',
            batch_size=16,
            epochs=5
        )
        
        # Load data
        # Update this path to where your Excel file is located
        df = pd.read_excel("Final_100_Questions.xlsx")
        
        # Prepare data
        train_examples, val_examples = evaluator.prepare_data(df)
        
        # Train model
        evaluator.train(train_examples, val_examples)
        
        # Test the model
        test_question = "What is object-oriented programming?"
        test_answer = "It's a programming paradigm based on objects that contain data and code."
        correct_answer = "Object-oriented programming is a programming paradigm based on the concept of objects, which can contain data and code."
        
        confidence = evaluator.evaluate_answer(
            test_question,
            test_answer,
            correct_answer
        )
        
        print(f"Confidence score: {confidence:.2f}%")

    except Exception as e:
        logging.error(f"Training failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()