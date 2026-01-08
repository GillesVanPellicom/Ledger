import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import * as SolidIcons from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { PaymentMethod, PaymentMethodStyle } from '../../types';

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
  '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#818cf8', '#c084fc',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA', '#F0C419',
  '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#EE6352', '#59C3C3',
];

const emojis = [
  '💳', '💵', '💶', '💷', '💴', '🏦', '💰', '🧾', '🛒', '🛍️', '🏠', '🏡', '🏢', '🚗', '✈️', '🚀', '⛵', '🎁', '🎉', '🍔', '🍕', '🍟', '💻', '📱', '⌚', '💡', '🔧', '🔨', '📈', '📉', '💼', '👔', '🎓', '💊', '🏥', '⛽', '⚡', '🌍', '🌞', '🌚', '⭐', '🔥', '💧', '💨', '🌊',
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
];

interface PaymentMethodStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (methodId: number, style: PaymentMethodStyle) => void;
  method: PaymentMethod;
  currentStyle?: PaymentMethodStyle;
}

const PaymentMethodStyleModal: React.FC<PaymentMethodStyleModalProps> = ({ isOpen, onClose, onSave, method, currentStyle }) => {
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [selectedSymbol, setSelectedSymbol] = useState('CreditCardIcon');
  const [symbolType, setSymbolType] = useState<'icon' | 'emoji'>('icon');
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [emojiSearchTerm, setEmojiSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentStyle?.color || colors[0]);
      setSelectedSymbol(currentStyle?.symbol || (currentStyle?.type === 'emoji' ? emojis[0] : 'CreditCardIcon'));
      setSymbolType(currentStyle?.type || 'icon');
      setIconSearchTerm('');
      setEmojiSearchTerm('');
    }
  }, [isOpen, currentStyle]);

  const filteredIcons = useMemo(() => {
    if (!iconSearchTerm) return Object.keys(SolidIcons);
    return Object.keys(SolidIcons).filter(iconName =>
      iconName.toLowerCase().includes(iconSearchTerm.toLowerCase())
    );
  }, [iconSearchTerm]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchTerm) return emojis;
    return emojis.filter(emoji =>
      emoji.includes(emojiSearchTerm)
    );
  }, [emojiSearchTerm]);

  const handleSave = () => {
    onSave(method.PaymentMethodID, { color: selectedColor, symbol: selectedSymbol, type: symbolType });
    onClose();
  };

  const IconComponent = symbolType === 'icon' ? (SolidIcons as any)[selectedSymbol] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Style: ${method?.PaymentMethodName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save Style</Button></>}
      size="lg"
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Preview</h3>
            <div
              className="rounded-lg p-4 transition-all duration-200"
              style={{ backgroundColor: selectedColor }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-white">{method?.PaymentMethodName}</h4>
                {symbolType === 'icon' && IconComponent && <IconComponent className="h-8 w-8 text-white/70" />}
                {symbolType === 'emoji' && <span className="text-3xl">{selectedSymbol}</span>}
              </div>
              <div className="mt-4 text-right">
                <p className="text-xs text-white/80">Current Balance</p>
                <p className="text-2xl font-semibold text-white">€ 1,234.56</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Color</h3>
            <div className="grid grid-cols-6 gap-3">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform duration-150",
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-blue-500 scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
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
      </div>
    </Modal>
  );
};

export default PaymentMethodStyleModal;
