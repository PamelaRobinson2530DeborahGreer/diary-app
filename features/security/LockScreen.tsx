// features/security/LockScreen.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Fingerprint } from 'lucide-react';
import { cryptoService } from '@/services/crypto';

interface LockScreenProps {
  onUnlock: (key: CryptoKey) => void;
  isSetup?: boolean;
  storedHash?: string;
  storedSalt?: string;
  hasBiometric?: boolean;
  canUseBiometric?: boolean;
}

export function LockScreen({
  onUnlock,
  isSetup = false,
  storedHash,
  storedSalt,
  hasBiometric = false,
  canUseBiometric = false
}: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30; // seconds

  // Handle lockout timer
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
        if (lockTimer === 1) {
          setIsLocked(false);
          setAttempts(0);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockTimer]);

  // Handle digit input
  const handleDigitClick = (digit: string) => {
    if (isLocked) return;

    const targetPin = isSetup && pin.length === 6 ? confirmPin : pin;
    const setTargetPin = isSetup && pin.length === 6 ? setConfirmPin : setPin;

    if (targetPin.length < 6) {
      setTargetPin(targetPin + digit);
      setError('');
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    if (isLocked) return;

    if (isSetup && pin.length === 6 && confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1));
    } else if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  // Clear all input
  const handleClear = () => {
    if (isLocked) return;
    setPin('');
    setConfirmPin('');
    setError('');
  };

  // Validate PIN format
  const validatePin = (pinToValidate: string): string | null => {
    if (pinToValidate.length !== 6) {
      return 'PIN 必须是 6 位数字';
    }

    // Check if all digits are the same
    if (/^(.)\1+$/.test(pinToValidate)) {
      return 'PIN 不能是重复的数字';
    }

    // Check if sequential
    const isSequential = (str: string) => {
      for (let i = 1; i < str.length; i++) {
        if (parseInt(str[i]) !== parseInt(str[i - 1]) + 1) {
          return false;
        }
      }
      return true;
    };

    if (isSequential(pinToValidate) || isSequential(pinToValidate.split('').reverse().join(''))) {
      return 'PIN 不能是连续的数字';
    }

    return null;
  };

  // Handle PIN submission
  const handleSubmit = async () => {
    if (isLocked) return;

    try {
      // Get SecurityContext from parent
      const securityContext = (window as any).__securityContext;

      if (isSetup) {
        // Setup mode - create new PIN
        if (pin.length !== 6) {
          setError('请输入 6 位 PIN');
          return;
        }

        if (confirmPin.length !== 6) {
          setError('请再次输入 PIN 确认');
          return;
        }

        if (pin !== confirmPin) {
          setError('两次输入的 PIN 不一致');
          setConfirmPin('');
          return;
        }

        const validationError = validatePin(pin);
        if (validationError) {
          setError(validationError);
          return;
        }

        // Use SecurityContext to setup PIN
        if (securityContext?.setupPIN) {
          await securityContext.setupPIN(pin);
          // The SecurityContext will handle unlocking
          onUnlock(null as any); // Just signal completion

          // Show biometric setup prompt if available
          if (canUseBiometric && !hasBiometric) {
            setShowBiometricSetup(true);
          }
        } else {
          // Fallback for standalone usage
          const salt = cryptoService.generateSalt();
          const key = await cryptoService.deriveKey(pin, salt as BufferSource);
          const hash = await cryptoService.hashPIN(pin, salt);

          const settings = {
            lockEnabled: true,
            pinHash: hash,
            salt: Array.from(salt).join(',')
          };
          localStorage.setItem('security_settings', JSON.stringify(settings));
          onUnlock(key);
        }

      } else {
        // Unlock mode - verify existing PIN
        if (pin.length !== 6) {
          setError('请输入完整的 PIN');
          return;
        }

        // Try to use SecurityContext
        if (securityContext?.unlock) {
          const success = await securityContext.unlock(pin);
          if (success) {
            onUnlock(null as any); // Just signal completion
          } else {
            // Wrong PIN
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPin('');

            if (newAttempts >= MAX_ATTEMPTS) {
              setIsLocked(true);
              setLockTimer(LOCK_DURATION);
              setError(`已锁定，请等待 ${LOCK_DURATION} 秒`);
            } else {
              setError(`PIN 错误，剩余尝试: ${MAX_ATTEMPTS - newAttempts} 次`);
            }
          }
        } else if (storedHash && storedSalt) {
          // Fallback for standalone usage
          const salt = new Uint8Array(storedSalt.split(',').map(Number));
          const isValid = await cryptoService.verifyPIN(pin, salt, storedHash);

          if (isValid) {
            const key = await cryptoService.deriveKey(pin, salt);
            onUnlock(key);
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPin('');

            if (newAttempts >= MAX_ATTEMPTS) {
              setIsLocked(true);
              setLockTimer(LOCK_DURATION);
              setError(`已锁定，请等待 ${LOCK_DURATION} 秒`);
            } else {
              setError(`PIN 错误，剩余尝试: ${MAX_ATTEMPTS - newAttempts} 次`);
            }
          }
        } else {
          setError('安全设置错误，请重新设置');
        }
      }
    } catch (error) {
      console.error('PIN processing error:', error);
      setError('处理 PIN 时出错');
    }
  };

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (!isSetup && pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  // Handle biometric unlock
  const handleBiometricUnlock = async () => {
    const securityContext = (window as any).__securityContext;
    if (securityContext?.unlockWithBiometric) {
      try {
        const success = await securityContext.unlockWithBiometric();
        if (success) {
          onUnlock(null as any);
        } else {
          setError('生物识别验证失败，请使用 PIN');
        }
      } catch (error) {
        setError('生物识别验证失败，请使用 PIN');
      }
    }
  };

  // Handle biometric setup
  const handleBiometricSetup = async () => {
    const securityContext = (window as any).__securityContext;
    if (securityContext?.setupBiometric) {
      try {
        const success = await securityContext.setupBiometric();
        if (success) {
          setShowBiometricSetup(false);
        } else {
          setError('生物识别设置失败');
        }
      } catch (error) {
        setError('生物识别设置失败');
      }
    }
  };

  // Render digit buttons
  const renderDigitButton = (digit: string) => (
    <button
      key={digit}
      onClick={() => handleDigitClick(digit)}
      disabled={isLocked}
      data-digit={digit}
      className="w-20 h-20 text-2xl font-semibold bg-secondary hover:bg-secondary/80 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {digit}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4" data-testid="lock-screen">
      <div className="max-w-sm w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {isSetup ? '设置 PIN 码' : '输入 PIN 码解锁'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isSetup
              ? '设置 6 位数字 PIN 码保护你的日记'
              : '输入你的 PIN 码访问日记'}
          </p>
        </div>

        {/* PIN Display */}
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-colors ${
                  i < pin.length
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
              >
                {i < pin.length && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            ))}
          </div>

          {/* Confirm PIN (setup only) */}
          {isSetup && pin.length === 6 && (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">确认 PIN 码</p>
              <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={`confirm-${i}`}
                    className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-colors ${
                      i < confirmPin.length
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    {i < confirmPin.length && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Lock Timer */}
        {isLocked && lockTimer > 0 && (
          <div className="text-center">
            <p className="text-lg font-semibold text-destructive">
              请等待 {lockTimer} 秒
            </p>
          </div>
        )}

        {/* Digit Buttons */}
        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(renderDigitButton)}

          <button
            onClick={handleClear}
            disabled={isLocked}
            className="w-20 h-20 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-full transition-colors disabled:opacity-50"
          >
            清除
          </button>

          {renderDigitButton('0')}

          <button
            onClick={handleBackspace}
            disabled={isLocked}
            className="w-20 h-20 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-full transition-colors disabled:opacity-50"
          >
            ←
          </button>
        </div>

        {/* Submit Button (setup only) */}
        {isSetup && confirmPin.length === 6 && (
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
          >
            确认设置
          </button>
        )}

        {/* Biometric Option */}
        {!isSetup && hasBiometric && (
          <button
            onClick={handleBiometricUnlock}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-5 h-5" />
            <span>使用生物识别解锁</span>
          </button>
        )}

        {/* Biometric Setup Dialog */}
        {showBiometricSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold">启用生物识别</h3>
              </div>

              <p className="text-sm text-muted-foreground">
                是否要启用生物识别（Touch ID/Face ID）快速解锁？
                您仍可以随时使用 PIN 码解锁。
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBiometricSetup(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-secondary"
                >
                  稍后设置
                </button>
                <button
                  onClick={handleBiometricSetup}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  启用
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning for setup */}
        {isSetup && (
          <div className="text-xs text-center text-muted-foreground">
            ⚠️ 重要：如果忘记 PIN 码，加密的数据将无法恢复
          </div>
        )}
      </div>
    </div>
  );
}