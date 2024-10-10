'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import confetti from 'canvas-confetti'
import { Facebook, Twitter, Instagram, Heart, Linkedin, Send } from 'lucide-react'
import { ObjectId } from 'mongodb'
import { Analytics } from '@vercel/analytics/react'

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF6B00" />
    <path d="M10 15C10 12.2386 12.2386 10 15 10H25C27.7614 10 30 12.2386 30 15V25C30 27.7614 27.7614 30 25 30H15C12.2386 30 10 27.7614 10 25V15Z" fill="white" />
    <path d="M20 23C21.6569 23 23 21.6569 23 20C23 18.3431 21.6569 17 20 17C18.3431 17 17 18.3431 17 20C17 21.6569 18.3431 23 20 23Z" fill="#FF6B00" />
    <path d="M22 14L23.5 16L25 14H22Z" fill="#FF6B00" />
    <path d="M20 15L22 19L20 23L18 19L20 15Z" fill="#0066FF" />
  </svg>
)

const CloudUploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12.586L16.243 16.828L17.657 15.414L13.414 11.172L12 9.757L10.586 11.172L6.343 15.414L7.757 16.828L12 12.586Z" fill="currentColor" />
    <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20Z" fill="currentColor" />
  </svg>
)

interface GeminiResponse {
  "Golden Ratio": string;
  "Facial Symmetry": string;
  "Averageness": string;
  "Facial Feature Ratios": string;
  "Dress Code": string;
  "Picture Angle": string;
  appearance: string;
  file_type?: string;
}

interface TopScorer {
  _id: ObjectId;
  name: string;
  score: number;
  avatar: string;
}

export default function PicRate() {
  const [image, setImage] = useState<string | null>(null)
  const [attractiveness, setAttractiveness] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [topScorers, setTopScorers] = useState<TopScorer[]>([])
  const [analysisResults, setAnalysisResults] = useState<GeminiResponse | null>(null)
  const [finalScore, setFinalScore] = useState<number>(0)

  useEffect(() => {
    fetchTopScorers()
  }, [])

  const fetchTopScorers = async () => {
    try {
      const response = await fetch('/api/chat/topScorers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTopScorers(data);
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      toast.error('Failed to fetch top scorers');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      toast.error('Please upload only PNG or JPEG images.');
      return;
    }
  
    setIsLoading(true);
  
    try {
      const formData = new FormData();
      formData.append('image', file);
  
      // console.log('Sending request to backend...');
      const response = await fetch('/api/chat/cache', {
        method: 'POST',
        body: formData,
      });
  
      // console.log('Received response from backend');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (data.error) {
        throw new Error(data.error);
      }
  
      // Set the analysis results and score
      setAnalysisResults(data.results);
      setFinalScore(data.score);
      setAttractiveness(data.score);
  
      // Set the image preview
      setImage(data.imageData);
  
      // Update top scorers
      if (username) {
        await updateTopScorers(username, data.score, data.hash, data.imageData);
      }
  
      // Trigger confetti effect
      confetti();
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error('Error analyzing image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (!username.trim()) {
      toast.error('Please enter your name before uploading a photo.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleShare = (platform: string) => {
    const shareText = `I just got rated ${attractiveness}% attractive on PicRate! Check it out!`
    const shareUrl = 'https://picrate.example.com' // Replace with your actual URL

    switch (platform) {
      case 'Facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'Twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
        break
      case 'Instagram':
        toast.info('To share on Instagram, please screenshot your results and post it to your story or feed.')
        break
      case 'LinkedIn':
        window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('My PicRate Score')}&summary=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'WhatsApp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')
        break
      default:
        toast.error('Sharing not implemented for this platform.')
    }

    toast.success(`Shared on ${platform}!`)
  }

// Improved implementation
const updateTopScorers = async (name: string, score: number, hash: string, imageData: string) => {
  try {
    // Validation
    if (!name.trim() || score < 0 || score > 100 || !hash || !imageData) {
      throw new Error('Invalid input data');
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('score', score.toString());
    formData.append('hash', hash);
    formData.append('image', imageData);

    const response = await fetch('/api/chat/topScorers', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    const updatedTopScorers = await response.json();
    
    // Type checking
    if (!Array.isArray(updatedTopScorers)) {
      throw new Error('Invalid response format');
    }

    setTopScorers(updatedTopScorers);
    
    // Provide feedback
    // toast.success('Your score has been added to the leaderboard!');
    
  } catch (error) {
    // console.error('Error updating top scorers:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to update top scorers');
  }
};

  const TopScorersSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-4xl mb-8"
    >
      <h3 className="text-2xl font-semibold text-orange-500 mb-4">Top Scorers</h3>
      <div className="flex justify-between space-x-4">
        {topScorers.map((scorer, index) => (
          <Card key={index} className="flex-1">
            <CardContent className="p-4 text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden">
                <Image
                  src={scorer.avatar || '/avatar-placeholder.png'}
                  alt={scorer.name}
                  width={80}
                  height={80}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <p className="font-semibold">{scorer.name}</p>
              <p className="text-orange-500">{scorer.score}%</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 to-orange-100">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <motion.header
        className="bg-orange-500 shadow-md"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
            <h1 className="text-2xl font-semibold text-white ml-3">PicRate</h1>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="main-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-4xl text-center"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-orange-500 mb-4">
                Rate Your Look 🔥
              </h2>
              <p className="text-xl text-gray-700 mb-8">
                Enter your name, upload your photo, and get instant feedback on your style!
              </p>

              <TopScorersSection />
              <div className="mb-8 flex justify-center">
                <div className="relative w-full max-w-2xl aspect-[2/1]">
                  <Image
                    src="/anime.jpeg"
                    alt="Collage of people taking selfies"
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    style={{
                      objectFit: 'cover'
                    }}
                    className="rounded-lg shadow-xl"
                  />
                </div>
              </div>

              <Card className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CloudUploadIcon />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Upload your image</h3>
                    <p className="mt-1 text-sm text-gray-500">PNG or JPEG up to 10MB</p>
                    <div className="mt-6 space-y-4">
                      <Input
                        type="text"
                        placeholder="Enter your fabulous name 😎✨"
                        value={username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                        className="w-full"
                      />
                      <input
                        type="file"
                        id="file-upload"
                        className="sr-only"
                        accept="image/png,image/jpeg"
                        onChange={handleImageUpload}
                        ref={fileInputRef}
                      />
                      <Button
                        onClick={handleUploadClick}
                        className="inline-flex items-center px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-300"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        ) : (
                          <CloudUploadIcon />
                        )}
                        <span className="ml-2">{isLoading ? 'Processing...' : 'Select Image'}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-4xl"
            >
              <Card className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h2 className="text-3xl font-bold text-orange-500">
                          Congratulations, {username}! 🎉
                        </h2>
                        <p className="text-xl text-gray-700 mt-2">
                          You are {analysisResults?.appearance}!
                        </p>
                      </motion.div>
                      
                      <motion.div
                        className="flex flex-col md:flex-row gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="md:w-1/2">
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <Image
                                src={image}
                                alt="Uploaded image"
                                width={400}
                                height={400}
                                layout="responsive"
                                objectFit="cover"
                              />
                            </CardContent>
                          </Card>
                        </div>
                        <div className="md:w-1/2 space-y-4">
                          {analysisResults && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-sm">
                                <p><strong>Golden Ratio:</strong> {analysisResults["Golden Ratio"]}/10</p>
                                <p><strong>Facial Symmetry:</strong> {analysisResults["Facial Symmetry"]}/10</p>
                                <p><strong>Averageness:</strong> {analysisResults["Averageness"]}/10</p>
                              </div>
                              <div className="text-sm">
                                <p><strong>Feature Ratios:</strong> {analysisResults["Facial Feature Ratios"]}/10</p>
                                <p><strong>Dress Code:</strong> {analysisResults["Dress Code"]}/10</p>
                                <p><strong>Picture Angle:</strong> {analysisResults["Picture Angle"]}/10</p>
                              </div>
                            </div>
                          )}
                          <div className="text-center">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                              Your Beauty Score
                            </h3>
                            <div className="relative pt-1">
                              <div className="flex mb-2 items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200">
                                    {finalScore}% Attractive
                                  </span>
                                </div>
                              </div>
                              <Progress value={finalScore} className="h-2 bg-orange-200" />
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.p
                        className="text-center text-xl font-medium text-orange-600"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        You are absolutely stunning! 😍
                      </motion.p>

                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                      >
                        <p className="text-gray-700 mb-4">
                          Share your feedback with the world! Whether it is to inspire others or just for fun, PicRate allows you to share your appearance score on your favorite social platforms. Click the respective button below to share directly.
                        </p>
                      </motion.div>

                      <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                      >
                        <Button onClick={() => handleShare('Facebook')} className="bg-blue-600 hover:bg-blue-700">
                          <Facebook className="mr-2 h-4 w-4" /> Facebook
                        </Button>
                        <Button onClick={() => handleShare('Twitter')} className="bg-sky-500 hover:bg-sky-600">
                          <Twitter className="mr-2 h-4 w-4" /> Twitter
                        </Button>
                        <Button onClick={() => handleShare('Instagram')} className="bg-pink-600 hover:bg-pink-700">
                          <Instagram className="mr-2 h-4 w-4" /> Instagram
                        </Button>
                        <Button onClick={() => handleShare('LinkedIn')} className="bg-blue-700 hover:bg-blue-800">
                          <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
                        </Button>
                        <Button onClick={() => handleShare('WhatsApp')} className="bg-green-500 hover:bg-green-600">
                          <Send className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4 }}
                      >
                        <Button
                          onClick={() => {
                            setImage(null)
                            setAttractiveness(0)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          variant="outline"
                          className="w-full bg-white text-orange-500 hover:bg-orange-50 transition-colors duration-300"
                        >
                          Rate Another Photo
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <motion.footer
        className="bg-orange-500 text-white"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Made By</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
            </div>
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/in/harshalsinghcn/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-200 transition-colors duration-200">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://x.com/HarshalsinghCN" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-200 transition-colors duration-200">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://instagram.com/picrate.creator" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-200 transition-colors duration-200">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </motion.footer>
      <Analytics />
    </div>
  )
}