import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import * as SolidIcons from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { PaymentMethod, PaymentMethodStyle } from '../../types';

const emojis = [
  '💳', '💵', '💶', '💷', '💴', '🏦', '💰', '🧾', '🛒', '🛍️', '🏠', '🏡', '🏢', '🚗', '✈️', '🚀', '⛵', '🎁', '🎉', '🍔', '🍕', '🍟', '💻', '📱', '⌚', '💡', '🔧', '🔨', '📈', '📉', '💼', '👔', '🎓', '💊', '🏥', '⛽', '⚡', '🌍', '🌞', '🌚', '⭐', '🔥', '💧', '💨', '🌊',
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
];

const iconOrder = ['CreditCardIcon'];

interface PaymentMethodStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (methodId: number, style: Omit<PaymentMethodStyle, 'color'>) => void;
  method: PaymentMethod;
  currentStyle?: PaymentMethodStyle;
}

const PaymentMethodStyleModal: React.FC<PaymentMethodStyleModalProps> = ({ isOpen, onClose, onSave, method, currentStyle }) => {
  const [selectedSymbol, setSelectedSymbol] = useState('CreditCardIcon');
  const [symbolType, setSymbolType] = useState<'icon' | 'emoji'>('icon');
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [emojiSearchTerm, setEmojiSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedSymbol(currentStyle?.symbol || 'CreditCardIcon');
      setSymbolType(currentStyle?.type || 'icon');
      setIconSearchTerm('');
      setEmojiSearchTerm('');
    }
  }, [isOpen, currentStyle]);

  const filteredIcons = useMemo(() => {
    const otherIcons = Object.keys(SolidIcons).filter(iconName => !iconOrder.includes(iconName));
    let sortedIcons = [...iconOrder, ...otherIcons];
    if (iconSearchTerm) {
      sortedIcons = sortedIcons.filter(iconName =>
        iconName.toLowerCase().includes(iconSearchTerm.toLowerCase())
      );
    }
    return sortedIcons;
  }, [iconSearchTerm]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchTerm) return emojis;
    return emojis.filter(emoji =>
      emoji.includes(emojiSearchTerm)
    );
  }, [emojiSearchTerm]);

  const handleSave = () => {
    onSave(method.PaymentMethodID, { symbol: selectedSymbol, type: symbolType });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Style: ${method?.PaymentMethodName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save Style</Button></>}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => { setSymbolType('icon'); setSelectedSymbol('CreditCardIcon'); }} className={cn("px-4 py-2 text-sm font-medium", symbolType === 'icon' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700')}>Icons</button>
          <button onClick={() => { setSymbolType('emoji'); setSelectedSymbol(emojis[0]); }} className={cn("px-4 py-2 text-sm font-medium", symbolType === 'emoji' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700')}>Emojis</button>
        </div>
        {symbolType === 'icon' && (
          <>
            <Input placeholder="Search icons..." value={iconSearchTerm} onChange={(e) => setIconSearchTerm(e.target.value)} />
            <div className="h-56 overflow-y-auto grid grid-cols-8 gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {filteredIcons.map(iconName => {
                const Icon = (SolidIcons as any)[iconName];
                return <button key={iconName} onClick={() => setSelectedSymbol(iconName)} className={cn("flex items-center justify-center p-2 rounded-lg transition-colors", selectedSymbol === iconName ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700')} title={iconName}><Icon className="h-6 w-6" /></button>;
              })}
            </div>
          </>
        )}
        {symbolType === 'emoji' && (
          <>
            <Input placeholder="Search emojis..." value={emojiSearchTerm} onChange={(e) => setEmojiSearchTerm(e.target.value)} />
            <div className="h-56 overflow-y-auto grid grid-cols-8 gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {filteredEmojis.map(emoji => (
                <button key={emoji} onClick={() => setSelectedSymbol(emoji)} className={cn("flex items-center justify-center p-2 rounded-lg transition-colors text-2xl", selectedSymbol === emoji ? 'bg-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-700')}>{emoji}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PaymentMethodStyleModal;
