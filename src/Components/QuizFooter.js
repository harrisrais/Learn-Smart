import React from 'react';

function QuizFooter() {
  return (
    <footer className="mt-auto bg-gray-700 text-white py-5 text-sm">
      <div className="text-center">
        <p className="mb-1">&copy; 2025 Learn-Smart. All rights reserved.</p>
        <div className="flex justify-center space-x-4">
          <a href="/" className="hover:text-blue-300">About Us</a>
          <a href="/" className="hover:text-blue-300">Contact</a>
          <a href="/" className="hover:text-blue-300">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default QuizFooter;