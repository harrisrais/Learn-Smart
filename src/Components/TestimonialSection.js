import React, { useState, useEffect } from 'react';
import { Star, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';

const COLLECTION_NAME = "testimonials";

const TestimonialSection = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [testimonials, setTestimonials] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [testimonialsPerView, setTestimonialsPerView] = useState(3);

  useEffect(() => {
    const updateTestimonialsPerView = () => {
      if (window.innerWidth < 768) {
        setTestimonialsPerView(1);
      } else if (window.innerWidth < 1024) {
        setTestimonialsPerView(2);
      } else if (window.innerWidth < 1280) {
        setTestimonialsPerView(3);
      } else {
        setTestimonialsPerView(4);
      }
    };

    updateTestimonialsPerView();
    window.addEventListener('resize', updateTestimonialsPerView);
    return () => window.removeEventListener('resize', updateTestimonialsPerView);
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          orderBy("createdAt", "desc"),
          limit(20) 
        );

        const querySnapshot = await getDocs(q);
        const testimonialData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt?.toDate ? data.createdAt.toDate() : new Date();

          return {
            id: doc.id,
            ...data,
            createdAt
          };
        });

        console.log("Fetched testimonials:", testimonialData);
        setTestimonials(testimonialData);
        setError(null);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        setError("Failed to load testimonials. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [submitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError("Please select a rating before submitting");
      return;
    }

    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        name,
        email,
        message,
        rating,
        createdAt: Timestamp.now() 
      });

      setName('');
      setEmail('');
      setMessage('');
      setRating(0);
      setError(null);
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error("Error adding testimonial:", error);
      setError("Failed to submit testimonial. Please try again later.");
    }
  };

  const formatDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
      return "Unknown date";
    }
    return date.toLocaleDateString();
  };

  const maxSlide = Math.max(0, testimonials.length - testimonialsPerView);

  const nextSlide = () => {
    if (testimonials.length > testimonialsPerView) {
      setCurrentSlide((prev) => 
        prev >= maxSlide ? 0 : prev + 1
      );
    }
  };

  const prevSlide = () => {
    if (testimonials.length > testimonialsPerView) {
      setCurrentSlide((prev) => 
        prev <= 0 ? maxSlide : prev - 1
      );
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <section id="testimonials" className="py-16 bg-white">
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">What Our Users Say</h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            Hear from students and educators who've transformed their learning experience
          </p>
        </div>

        <div className="w-full relative">{loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading Testimonials...</p>
            </div>
          ) : error && testimonials.length === 0 ? (
            <div className="text-center text-red-500">
              {error}
            </div>
          ) : testimonials.length > 0 ? (
            <>
              <div className="overflow-hidden relative">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentSlide * (100 / testimonialsPerView)}%)`,
                  }}
                >
                  {testimonials.map((testimonial) => (
                    <div 
                      key={testimonial.id} 
                      className="flex-shrink-0 px-3"
                      style={{ width: `${100 / testimonialsPerView}%` }}
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full border border-gray-100">
                        <div className="flex items-center mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-5 w-5"
                              fill={i < testimonial.rating ? "#FBBF24" : "none"}
                              stroke={i < testimonial.rating ? "#FBBF24" : "#E5E7EB"}
                            />
                          ))}
                        </div>
                        <p className="text-gray-700 italic mb-6 leading-relaxed min-h-[80px]">
                          "{testimonial.message}"
                        </p>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <div>
                            <span className="font-semibold text-gray-800 block">{testimonial.name}</span>
                            <span className="text-sm text-gray-500">
                              {formatDate(testimonial.createdAt)}
                            </span>
                          </div>
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {testimonial.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {testimonials.length > testimonialsPerView && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-blue-50 z-10 border border-gray-200"
                    aria-label="Previous testimonials"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-blue-50 z-10 border border-gray-200"
                    aria-label="Next testimonials"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg">No testimonials yet.</p>
                <p className="text-sm">Be the first to share your experience!</p>
              </div>
            </div>
          )}

          {testimonials.length > testimonialsPerView && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    currentSlide === index 
                      ? 'bg-blue-600 scale-110' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto bg-blue-50 rounded-xl shadow-lg p-8 mt-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Share Your Experience</h3>

          {submitted ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Thank you for your feedback! Your testimonial has been submitted.
            </div>
          ) : error && !loading ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-gray-700 font-medium mb-2">Your Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Rating</label>
              <div className="flex">
                {[...Array(5)].map((_, index) => {
                  const ratingValue = index + 1;

                  return (
                    <label key={index} className="cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        value={ratingValue}
                        onClick={() => setRating(ratingValue)}
                        className="hidden"
                      />
                      <Star
                        className="h-8 w-8 mr-1"
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                        fill={(hover || rating) >= ratingValue ? "#FBBF24" : "none"}
                        stroke={(hover || rating) >= ratingValue ? "#FBBF24" : "#9CA3AF"}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="message" className="block text-gray-700 font-medium mb-2">Your Experience</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center w-full md:w-auto"
            >
              Submit Testimonial <Send className="ml-2 h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;