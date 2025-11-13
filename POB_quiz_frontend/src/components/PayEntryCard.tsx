// src/components/PayEntryCard.tsx
import { useState, useEffect } from 'react';
import RegularPayEntryCard from './RegularPayEntryCard';
import MiniPayEntryCard from './MiniPayEntryCard';

type Props = {
  address?: `0x${string}` | null;
  onPaid: () => void;
  quantity?: number;
};

export default function PayEntryCard(props: Props) {
  const [isMiniPay, setIsMiniPay] = useState(false);

  // Detect MiniPay browser
  useEffect(() => {
    setIsMiniPay(
      window.navigator.userAgent.includes('MiniPay') || 
      !!(window as any).IS_MINIPAY
    );
  }, []);
  
  // Use completely different implementations based on browser
  if (isMiniPay) {
    return <MiniPayEntryCard {...props} />;
  } else {
    return <RegularPayEntryCard {...props} />;
  }
}
