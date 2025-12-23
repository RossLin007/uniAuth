/**
 * Captcha Verification Component
 * 人机验证组件
 * 
 * A simple slider captcha to prevent automated SMS abuse
 * 简单的滑块验证，防止自动化短信滥用
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CaptchaProps {
    onVerify: (token: string) => void;
    onClose: () => void;
}

export default function SliderCaptcha({ onVerify, onClose }: CaptchaProps) {
    const { t, i18n } = useTranslation();
    const isZh = i18n.language.startsWith('zh');

    const [sliderPos, setSliderPos] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isError, setIsError] = useState(false);
    const [targetPos, setTargetPos] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const TOLERANCE = 10; // Allowed tolerance in pixels
    const TRACK_WIDTH = 280;
    const SLIDER_WIDTH = 50;

    // Generate random target position on mount
    useEffect(() => {
        const minPos = 100;
        const maxPos = TRACK_WIDTH - SLIDER_WIDTH - 30;
        setTargetPos(Math.floor(Math.random() * (maxPos - minPos) + minPos));
    }, []);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isVerified) return;
        setIsDragging(true);
        setIsError(false);
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        let clientX: number;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        let newPos = clientX - rect.left - SLIDER_WIDTH / 2;
        newPos = Math.max(0, Math.min(newPos, TRACK_WIDTH - SLIDER_WIDTH));
        setSliderPos(newPos);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // Check if slider is at the target position
        if (Math.abs(sliderPos - targetPos) <= TOLERANCE) {
            setIsVerified(true);
            // Generate a verification token
            const token = generateToken();
            setTimeout(() => {
                onVerify(token);
            }, 500);
        } else {
            setIsError(true);
            // Reset slider position
            setTimeout(() => {
                setSliderPos(0);
                setIsError(false);
                // Regenerate target position
                const minPos = 100;
                const maxPos = TRACK_WIDTH - SLIDER_WIDTH - 30;
                setTargetPos(Math.floor(Math.random() * (maxPos - minPos) + minPos));
            }, 800);
        }
    };

    // Generate a simple verification token
    const generateToken = (): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        // This token will be validated on the server
        return `captcha_${timestamp}_${random}`;
    };

    return (
        <div className="captcha-overlay">
            <div className="captcha-modal">
                <div className="captcha-header">
                    <h3>{isZh ? '安全验证' : 'Security Verification'}</h3>
                    <button onClick={onClose} className="captcha-close">×</button>
                </div>

                <div className="captcha-body">
                    <p className="captcha-hint">
                        {isZh
                            ? '请拖动滑块到缺口位置'
                            : 'Drag the slider to the gap position'}
                    </p>

                    {/* Puzzle Image Area */}
                    <div className="captcha-puzzle">
                        <div
                            className="captcha-target"
                            style={{ left: `${targetPos}px` }}
                        />
                        <div
                            className={`captcha-piece ${isVerified ? 'verified' : ''} ${isError ? 'error' : ''}`}
                            style={{ left: `${sliderPos}px` }}
                        />
                    </div>

                    {/* Slider Track */}
                    <div
                        ref={trackRef}
                        className="captcha-track"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    >
                        <div
                            className="captcha-progress"
                            style={{ width: `${sliderPos + SLIDER_WIDTH}px` }}
                        />
                        <div
                            ref={sliderRef}
                            className={`captcha-slider ${isDragging ? 'dragging' : ''} ${isVerified ? 'verified' : ''}`}
                            style={{ left: `${sliderPos}px` }}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleMouseDown}
                        >
                            {isVerified ? '✓' : '→'}
                        </div>

                        {!isDragging && sliderPos === 0 && !isVerified && (
                            <span className="captcha-tip">
                                {isZh ? '向右拖动滑块' : 'Drag right'}
                            </span>
                        )}
                    </div>

                    {isVerified && (
                        <p className="captcha-success">
                            {isZh ? '验证成功！' : 'Verification successful!'}
                        </p>
                    )}

                    {isError && (
                        <p className="captcha-error-msg">
                            {isZh ? '验证失败，请重试' : 'Verification failed, please try again'}
                        </p>
                    )}
                </div>
            </div>

            <style>{`
                .captcha-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease-out;
                }
                
                .captcha-modal {
                    background: white;
                    border-radius: 16px;
                    width: 320px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .captcha-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .captcha-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e293b;
                }
                
                .captcha-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }
                
                .captcha-close:hover {
                    color: #64748b;
                }
                
                .captcha-body {
                    padding: 20px;
                }
                
                .captcha-hint {
                    text-align: center;
                    color: #64748b;
                    font-size: 14px;
                    margin: 0 0 16px;
                }
                
                .captcha-puzzle {
                    position: relative;
                    height: 120px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    margin-bottom: 16px;
                    overflow: hidden;
                }
                
                .captcha-target {
                    position: absolute;
                    top: 35px;
                    width: 50px;
                    height: 50px;
                    background: rgba(255, 255, 255, 0.3);
                    border: 2px dashed rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                }
                
                .captcha-piece {
                    position: absolute;
                    top: 35px;
                    width: 50px;
                    height: 50px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                    transition: background 0.3s;
                }
                
                .captcha-piece.verified {
                    background: #10b981;
                }
                
                .captcha-piece.error {
                    background: #ef4444;
                    animation: shake 0.5s ease-out;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-5px); }
                    40%, 80% { transform: translateX(5px); }
                }
                
                .captcha-track {
                    position: relative;
                    height: 44px;
                    background: #f1f5f9;
                    border-radius: 22px;
                    cursor: pointer;
                    user-select: none;
                }
                
                .captcha-progress {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    background: linear-gradient(90deg, #0ea5e9, #06b6d4);
                    border-radius: 22px;
                    transition: width 0.05s;
                }
                
                .captcha-slider {
                    position: absolute;
                    top: 2px;
                    width: 50px;
                    height: 40px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    color: #0ea5e9;
                    cursor: grab;
                    transition: transform 0.1s, box-shadow 0.2s;
                }
                
                .captcha-slider.dragging {
                    cursor: grabbing;
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                
                .captcha-slider.verified {
                    background: #10b981;
                    color: white;
                }
                
                .captcha-tip {
                    position: absolute;
                    left: 60px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    font-size: 13px;
                    pointer-events: none;
                }
                
                .captcha-success {
                    text-align: center;
                    color: #10b981;
                    font-size: 14px;
                    font-weight: 500;
                    margin: 12px 0 0;
                }
                
                .captcha-error-msg {
                    text-align: center;
                    color: #ef4444;
                    font-size: 14px;
                    margin: 12px 0 0;
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .captcha-modal {
                        background: #1e293b;
                    }
                    
                    .captcha-header {
                        border-color: #334155;
                    }
                    
                    .captcha-header h3 {
                        color: #e2e8f0;
                    }
                    
                    .captcha-track {
                        background: #334155;
                    }
                    
                    .captcha-tip {
                        color: #64748b;
                    }
                }
            `}</style>
        </div>
    );
}
