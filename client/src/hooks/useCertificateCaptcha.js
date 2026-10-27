import { useCallback, useEffect, useRef, useState } from 'react';
import { certificateAPI } from '../utils/api';

export default function useCertificateCaptcha() {
  const [challenge, setChallenge] = useState({ captcha: '', captchaToken: '' });
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setChallenge({ captcha: '', captchaToken: '' });
    setAnswer('');
    setError('');
    try {
      const response = await certificateAPI.getCaptcha();
      const data = response.data.data;
      if (!data?.captcha || !data?.captchaToken) throw new Error('Missing CAPTCHA challenge');
      if (id === requestId.current) setChallenge(data);
    } catch {
      if (id === requestId.current) setError('Unable to load CAPTCHA. Please refresh and try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const requests = requestId;
    refresh();
    return () => { requests.current++; };
  }, [refresh]);
  return { ...challenge, answer, setAnswer, loading, error, refresh };
}
