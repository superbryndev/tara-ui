"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Track, 
  Room, 
  RoomEvent,
  LocalParticipant
} from 'livekit-client';
import {
  LiveKitRoom,
  useParticipants,
  useTracks,
  useRoomContext,
  useLocalParticipant,
  useParticipantInfo,
} from '@livekit/components-react';
import { motion } from 'framer-motion';

// Max call duration in seconds (5 minutes)
const MAX_CALL_DURATION = 5 * 60;

type FeedbackData = {
  taskCompleted: boolean;
  humanScore: number;
  feedbackText: string;
  timestamp: string;
};

export default function Page() {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Function to connect to the LiveKit room
  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    
    try {
      const response = await fetch('/api/connection-details?agent=tara');
      
      if (!response.ok) {
        throw new Error(`Failed to get connection details: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received connection details:', data);
      
      if (!data.participantToken || !data.serverUrl) {
        throw new Error('Invalid connection details received');
      }
      
      setToken(data.participantToken);
      setServerUrl(data.serverUrl);
      setConnecting(false);
      
    } catch (error) {
      console.error('Error connecting to agent:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to agent');
      setConnecting(false);
    }
  }, []);

  // Function to handle disconnection
  const handleDisconnect = useCallback(() => {
    setShowFeedbackForm(true);
  }, []);

  // Function to handle feedback submission
  const handleFeedbackSubmit = useCallback(async (data: FeedbackData) => {
    try {
      console.log('Submitting feedback to database:', data);
      
      // Submit feedback to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }
      
      // Mark feedback as submitted
      setFeedbackSubmitted(true);
      
      // Reset state after a brief delay to show success message
      setTimeout(() => {
        setShowFeedbackForm(false);
        setToken('');
        setFeedbackSubmitted(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still reset state even if there's an error, but after a longer delay
      setTimeout(() => {
        setShowFeedbackForm(false);
        setToken('');
        setFeedbackSubmitted(false);
      }, 3000);
    }
  }, []);

  // If showing feedback form
  if (showFeedbackForm) {
    return <FeedbackForm 
      onSubmit={handleFeedbackSubmit} 
      onClose={() => setToken('')}
      isSubmitted={feedbackSubmitted} 
    />;
  }

  // If not connected yet
  if (!token) {
    return <WelcomeScreen onConnect={handleConnect} connecting={connecting} error={error} />;
  }

  // Connected to room
  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100dvh' }}
      onDisconnected={handleDisconnect}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <div className="flex flex-col h-full items-center justify-center">
        <VoiceConferenceWrapper onDisconnect={handleDisconnect} />
      </div>
    </LiveKitRoom>
  );
}

// Wrapper component that includes the necessary LiveKit components
function VoiceConferenceWrapper({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <>
      <AutoDisconnectTimer onDisconnect={onDisconnect} />
      <InitRoom />
      <VoiceConference onDisconnect={onDisconnect} />
      <CustomAudioRenderer />
    </>
  );
}

// Timer component that automatically disconnects after MAX_CALL_DURATION
function AutoDisconnectTimer({ onDisconnect }: { onDisconnect: () => void }) {
  useEffect(() => {
    console.log(`Call will automatically end after ${MAX_CALL_DURATION} seconds`);
    const timer = setTimeout(() => {
      console.log('Auto-disconnecting after 5 minutes');
      onDisconnect();
    }, MAX_CALL_DURATION * 1000);
    
    return () => clearTimeout(timer);
  }, [onDisconnect]);
  
  return null;
}

// Custom audio renderer to replace RoomAudioRenderer
function CustomAudioRenderer() {
  const room = useRoomContext();
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!room) return;

    // Handle new tracks being published
    const onTrackSubscribed = (track: Track, publication: any, participant: any) => {
      if (track.kind === 'audio') {
        const audioEl = new Audio();
        audioEl.srcObject = new MediaStream([track.mediaStreamTrack]);
        audioEl.autoplay = true;
        audioElements.current.set(participant.sid, audioEl);
        
        // Clean up on track unsubscribed
        const handleUnsubscribed = () => {
          if (audioElements.current.has(participant.sid)) {
            audioElements.current.delete(participant.sid);
          }
          participant.off('trackUnsubscribed', handleUnsubscribed);
        };
        
        participant.on('trackUnsubscribed', handleUnsubscribed);
      }
    };

    // Add event listener to the room
    room.on('trackSubscribed', onTrackSubscribed);

    // Clean up
    return () => {
      room.off('trackSubscribed', onTrackSubscribed);
      audioElements.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      audioElements.current.clear();
    };
  }, [room]);

  // No visual element needed
  return null;
}

// Welcome screen shown before connecting
function WelcomeScreen({ 
  onConnect, 
  connecting,
  error 
}: { 
  onConnect: () => void;
  connecting: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="welcome-container clean-panel p-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-[var(--accent-bg)] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <h1 className="mb-4">
            <span className="text-3xl font-medium block mb-1">Talk to</span>
            <span className="text-5xl font-bold text-gradient">Tara</span>
          </h1>
          
          <p className="text-lg mb-2 text-[var(--muted-color)]">
            Medical Counselor
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            Get help with your gallbladder stone concerns and book an appointment
          </p>
        </div>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        <button
          onClick={onConnect}
          disabled={connecting}
          className="welcome-button w-full flex items-center justify-center"
        >
          {connecting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : (
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h5m0 0v5m0-5l-6 6M8 21H3m0 0v-5m0 5l6-6" />
              </svg>
              Start Talking
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// Voice call UI component
function VoiceConference({ onDisconnect }: { onDisconnect: () => void }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const room = useRoomContext();

  // Track call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Set up local participant and track active speaker
  const participantInfo = useParticipantInfo();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const handleActiveSpeaker = (speakers: any[]) => {
      // Check if any remote participant (the agent) is speaking
      const agentIsSpeaking = speakers.some(
        (speaker) => speaker.participant && 
                     !speaker.participant.isLocal && 
                     speaker.speaking
      );
      setIsPulsing(agentIsSpeaking);
    };

    if (room) {
      room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeaker);
    }

    return () => {
      if (room) {
        room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeaker);
      }
    };
  }, [room]);

  // Toggle mute functionality
  const toggleMute = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted)
        .then(() => {
          setIsMuted(!isMuted);
          console.log(isMuted ? 'Microphone enabled' : 'Microphone muted');
        })
        .catch((error) => {
          console.error('Error toggling microphone:', error);
        });
    }
  };

  return (
    <div className="flex items-center justify-center h-screen p-4">
      <div className="call-container">
        {/* Call info bar */}
        <div className="call-info-bar">
          <div className="flex items-center space-x-2">
            <div className="text-lg font-semibold text-[var(--muted-color)]">Tara</div>
            <div className="w-2 h-2 rounded-full bg-[var(--accent-color)]"></div>
            <div className="text-sm text-[var(--muted-color)]">Medical Counselor</div>
          </div>
          <div className="call-timer">{formatTime(callDuration)}</div>
        </div>
        
        {/* Main call area */}
        <div className="p-8 flex flex-col items-center">
          {/* User info */}
          <div className="mb-6 text-center">
            <div className="text-lg font-medium text-[var(--muted-color)]">
              {participantInfo?.identity || "You"}
            </div>
          </div>
          
          {/* Voice indicator */}
          <div className="py-10 relative">
            <div className={`voice-circle ${isPulsing ? 'active' : ''}`}>
              <div className="voice-circle-outer"></div>
              <div className="voice-circle-ripple"></div>
            </div>
          </div>
          
          {/* Call controls */}
          <div className="call-controls">
            <div className={`call-control-button mute-button ${isMuted ? 'active' : ''}`}>
              <div className="icon-container" onClick={toggleMute}>
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>
            
            <div className="call-control-button end-call-button">
              <div className="icon-container" onClick={onDisconnect}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="text-sm font-medium">End Call</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feedback Form component
function FeedbackForm({ 
  onSubmit, 
  onClose,
  isSubmitted 
}: { 
  onSubmit: (data: FeedbackData) => Promise<void>;
  onClose: () => void;
  isSubmitted: boolean;
}) {
  const [taskCompleted, setTaskCompleted] = useState<boolean | null>(null);
  const [humanScore, setHumanScore] = useState<number>(3);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const maxSteps = 3;

  const handleSubmit = async () => {
    if (taskCompleted === null) {
      setError('Please indicate whether you were able to book successfully.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    await onSubmit({
      taskCompleted,
      humanScore,
      feedbackText,
      timestamp: new Date().toISOString()
    });
    
    setIsSubmitting(false);
  };

  const nextStep = () => {
    if (step === 1 && taskCompleted === null) {
      setError('Please select Yes or No before continuing');
      return;
    }
    
    if (step < maxSteps) {
      setStep(step + 1);
      setError(null);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[var(--background-rgb)] to-[var(--accent-bg)] p-4">
        <motion.div 
          className="welcome-container clean-panel p-10 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <div className="w-20 h-20 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </motion.div>
          <motion.h2 
            className="text-2xl font-bold mb-4 text-[var(--muted-color)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Thank you for your feedback!
          </motion.h2>
          <motion.p 
            className="text-[var(--accent-color-dark)] mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Your feedback helps us improve our services.
          </motion.p>
          
          <motion.button 
            onClick={onClose}
            className="welcome-button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Return to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[var(--background-rgb)] to-[var(--accent-bg)] p-4">
      <motion.div 
        className="welcome-container clean-panel p-10 relative overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative elements */}
        <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-[var(--accent-color-light)] opacity-20"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-[var(--accent-color-light)] opacity-20"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gradient">Your Feedback</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--muted-color)] bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="mb-8">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[var(--accent-color)]"
              initial={{ width: `${(1 / maxSteps) * 100}%` }}
              animate={{ width: `${(step / maxSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            ></motion.div>
          </div>
          <div className="flex justify-between text-xs mt-2 text-[var(--muted-color)]">
            <span>Start</span>
            <span>Finish</span>
          </div>
        </div>
        
        {/* Form Steps */}
        <div className="min-h-[320px]">
          {/* Step 1: Task completion */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold mb-6 text-[var(--muted-color)]">
                Were you able to book successfully?
              </h3>
              <div className="space-y-4">
                <motion.button
                  type="button"
                  onClick={() => setTaskCompleted(true)}
                  className={`w-full py-4 px-5 rounded-xl transition-all flex items-center ${
                    taskCompleted === true 
                      ? 'bg-[var(--accent-color)] text-white shadow-lg' 
                      : 'bg-white text-[var(--muted-color)] hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-6 h-6 rounded-full mr-3 border-2 flex items-center justify-center ${
                    taskCompleted === true 
                      ? 'border-white' 
                      : 'border-[var(--accent-color)]'
                  }`}>
                    {taskCompleted === true && (
                      <motion.div 
                        className="w-3 h-3 bg-white rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>
                  <span className="text-lg">Yes</span>
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => setTaskCompleted(false)}
                  className={`w-full py-4 px-5 rounded-xl transition-all flex items-center ${
                    taskCompleted === false 
                      ? 'bg-[var(--accent-color)] text-white shadow-lg' 
                      : 'bg-white text-[var(--muted-color)] hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-6 h-6 rounded-full mr-3 border-2 flex items-center justify-center ${
                    taskCompleted === false 
                      ? 'border-white' 
                      : 'border-[var(--accent-color)]'
                  }`}>
                    {taskCompleted === false && (
                      <motion.div 
                        className="w-3 h-3 bg-white rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>
                  <span className="text-lg">No</span>
                </motion.button>
              </div>
            </motion.div>
          )}
          
          {/* Step 2: Rating */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold mb-6 text-[var(--muted-color)]">
                How human-like was Tara?
              </h3>
              <div className="flex justify-between items-center mb-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <motion.button
                    key={rating}
                    type="button"
                    onClick={() => setHumanScore(rating)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-lg transition-colors ${
                      humanScore === rating 
                        ? 'bg-[var(--accent-color)] text-white shadow-lg' 
                        : 'bg-white text-[var(--muted-color)] border border-gray-200 shadow-sm hover:bg-gray-50'
                    }`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {rating}
                  </motion.button>
                ))}
              </div>
              <div className="flex justify-between text-sm mt-2 px-2 text-[var(--muted-color)]">
                <span>Very Robotic</span>
                <span>Very Human</span>
              </div>
              
              <div className="mt-8 p-4 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-color-dark)]">
                <div className="flex">
                  <div className="mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm">
                    Your rating helps us improve how natural and helpful Tara sounds when speaking with patients.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Step 3: Feedback text */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold mb-5 text-[var(--muted-color)]">
                Additional feedback
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Share your thoughts about your conversation with Tara and how we can improve.
              </p>
              <textarea
                id="feedback"
                rows={5}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                placeholder="Your feedback is valuable to us..."
              />
              
              <div className="flex items-center mt-4 text-sm text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Your feedback is anonymous and helps us improve our service.</span>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <motion.div 
            className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <motion.button
              type="button"
              onClick={prevStep}
              className="px-6 py-3 text-[var(--muted-color)] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center shadow-sm"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-[var(--muted-color)] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Skip
            </motion.button>
          )}
          
          <motion.button
            type="button"
            onClick={nextStep}
            className="px-6 py-3 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color-dark)] transition-all shadow-md flex items-center"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : step === maxSteps ? (
              <>Submit<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg></>
            ) : (
              <>Next<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg></>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// Room initialization component
function InitRoom() {
  const room = useRoomContext();
  
  useEffect(() => {
    if (room) {
      console.log('Connected to room:', room.name);
      
      // Check if permissions have already been granted
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permissions are granted, enable microphone
          room.localParticipant.setMicrophoneEnabled(true)
            .then(() => {
              console.log('Microphone enabled');
              // Trigger a voice greeting after 2 seconds
              setTimeout(() => {
                console.log('Ready for conversation with Tara');
              }, 2000);
            })
            .catch((error: Error) => {
              console.error('Error enabling microphone:', error);
            });
        })
        .catch((error) => {
          console.error('Error getting audio permissions:', error);
          alert('Please allow microphone access to talk with Tara.');
        });
    }
  }, [room]);
  
  return null;
}
