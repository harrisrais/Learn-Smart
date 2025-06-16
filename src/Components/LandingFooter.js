import React from 'react';

function LandingFooter() {
  return (
    <footer className="font-sans bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="mb-2">&copy; 2025 Learn-Smart. All rights reserved.</p>
        <div className="flex justify-center space-x-4">
          <a href="/" className="hover:text-blue-300">About Us</a>
          <a href="/" className="hover:text-blue-300">Contact</a>
          <a href="/" className="hover:text-blue-300">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;