import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Book, Users, ChevronRight, Sparkles, Star, BarChart } from 'lucide-react';
import TestimonialSection from './TestimonialSection';

function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  
  // Refs for scroll animations
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  const getStartedRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    // Observe sections
    const refs = [heroRef, featuresRef, testimonialsRef, getStartedRef];
    refs.forEach(ref => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const navbarClasses = `bg-blue-600 text-white shadow-md py-4 fixed top-0 w-full z-50 transition-all duration-300 ${
    scrolled ? 'bg-opacity-70 backdrop-filter backdrop-blur-md shadow-lg' : ''
  }`;

  const scrollToFeatures = (e) => {
    e.preventDefault();
    const featuresSection = document.getElementById('features');
    smoothScroll(featuresSection);
  };

  const scrollToTestimonials = (e) => {
    e.preventDefault();
    const testimonialsSection = document.getElementById('testimonials');
    smoothScroll(testimonialsSection);
  };

  const scrollToGetStarted = (e) => {
    e.preventDefault();
    const getStartedSection = document.getElementById('getstarted');
    smoothScroll(getStartedSection);
  };

  const smoothScroll = (targetElement) => {
    const startPosition = window.pageYOffset;
    const targetPosition = targetElement.getBoundingClientRect().top + startPosition;
    const distance = targetPosition - startPosition;
    const duration = 1500;
    let start = null;

    window.requestAnimationFrame(function step(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      window.scrollTo(0, easeInOutQuad(progress, startPosition, distance, duration));
      if (progress < duration) window.requestAnimationFrame(step);
    });
  };

  const easeInOutQuad = (t, b, c, d) => {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  };

  const getAnimationClass = (sectionId, delay = 0) => {
    const visible = visibleSections.has(sectionId);
    const delayClass = delay > 0 ? `delay-${delay}` : '';
    
    return `transition-all duration-1000 ease-out transform ${delayClass} ${
      visible 
        ? 'opacity-100 translate-y-0 scale-100' 
        : 'opacity-0 translate-y-8 scale-95'
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <nav className={navbarClasses}>
        <div className="container mx-auto pl-0 pr-4 flex justify-between items-center">
          <div className="flex items-center">
            <lord-icon
              src="https://cdn.lordicon.com/exymduqj.json"
              trigger="in"
              delay="1000"
              state="in-reveal"
              colors="primary:#ffffff,secondary:#ffffff"
              style={{ width: '30px', height: '40px', marginRight: '4px' }}
            ></lord-icon>
            <span className="flex items-center font-bold text-3xl">Learn-Smart</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <a href="#features" className="text-white hover:text-gray-200 transition" onClick={scrollToFeatures}>Features</a>
            <a href="#testimonials" className="text-white hover:text-gray-200 transition" onClick={scrollToTestimonials}>Testimonials</a>
            <a href="#getstarted" className="text-white hover:text-gray-200 transition" onClick={scrollToGetStarted}>Sign In</a>
          </div>
        </div>
      </nav>

      <div 
        ref={heroRef}
        id="hero"
        className={`bg-white bg-opacity-80 py-16 pt-24 ${getAnimationClass('hero')}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-5xl font-bold text-gray-800 leading-tight mb-4">
                Unlock Your Learning Potential
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Personalized, adaptive learning experiences that empower both students and educators.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#features"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center"
                  onClick={scrollToFeatures}
                >
                  Learn More <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <img
                src="https://plus.unsplash.com/premium_photo-1661434221886-dd2b73538f37?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE1NHx8fGVufDB8fHx8fA%3D%3D"
                alt="Students collaborating on digital learning platform"
                className="rounded-lg shadow-xl object-cover w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <main 
        ref={getStartedRef}
        id='getstarted' 
        className={`py-16 ${getAnimationClass('getstarted')}`}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Get Started Today</h2>
          <p className="text-xl text-center text-gray-600 mb-12">Choose your path and begin your learning journey</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className={`bg-white rounded-xl shadow-xl overflow-hidden transform transition hover:-translate-y-2 hover:shadow-2xl ${getAnimationClass('getstarted')}`}>
              <div className="bg-blue-600 h-2"></div>
              <div className="p-8">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Book className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">For Students</h2>
                <p className="text-gray-600 mb-8">Access personalized quizzes tailored to your learning style and track your progress in real-time.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>Adaptive learning paths</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>Instant feedback</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>Progress tracking</span>
                  </li>
                </ul>
                <Link to="/login/student"
                  className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                  Student Login
                </Link>
              </div>
            </div>

            <div className={`bg-white rounded-xl shadow-xl overflow-hidden transform transition hover:-translate-y-2 hover:shadow-2xl ${getAnimationClass('getstarted')}`}>
              <div className="bg-green-600 h-2"></div>
              <div className="p-8">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">For Teachers</h2>
                <p className="text-gray-600 mb-8">Create engaging content, manage classes efficiently, and gain insights into student performance.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <BarChart className="h-5 w-5 text-green-500 mr-2" />
                    <span>Performance analytics</span>
                  </li>
                  <li className="flex items-center">
                    <BarChart className="h-5 w-5 text-green-500 mr-2" />
                    <span>Content management</span>
                  </li>
                  <li className="flex items-center">
                    <BarChart className="h-5 w-5 text-green-500 mr-2" />
                    <span>Class management</span>
                  </li>
                </ul>
                <Link to="/login/teacher"
                  className="block w-full bg-green-600 text-white text-center px-6 py-3 rounded-lg hover:bg-green-700 transition">
                  Teacher Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section 
        ref={featuresRef}
        id="features" 
        className={`py-16 bg-gray-50 ${getAnimationClass('features')}`}
      >
        <div className="container mx-auto px-4">
          <h2 className={`text-3xl font-bold text-center text-gray-800 mb-12 ${getAnimationClass('features')}`}>
            Why Choose Learn-Smart?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${getAnimationClass('features')}`}>
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Adaptive Learning</h3>
              <p className="text-gray-600">Our system adjusts to each student's learning pace and style for optimal results.</p>
            </div>

            <div className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${getAnimationClass('features')}`}>
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BarChart className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Data-Driven Insights</h3>
              <p className="text-gray-600">Comprehensive analytics help identify strengths and areas for improvement.</p>
            </div>

            <div className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${getAnimationClass('features')}`}>
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Collaborative Environment</h3>
              <p className="text-gray-600">Foster engagement through peer learning and teacher-student interaction.</p>
            </div>
          </div>
        </div>
      </section>

      <div 
        ref={testimonialsRef}
        id="testimonials" 
        className={`w-full ${getAnimationClass('testimonials')}`}
      >
        <TestimonialSection />
      </div>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Learn-Smart</h3>
              <p className="text-gray-300">Empowering education through technology and innovative learning approaches.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">Tutorials</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Connect</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">LinkedIn</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Learn-Smart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;