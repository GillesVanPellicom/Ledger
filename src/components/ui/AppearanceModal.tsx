import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import * as SolidIcons from 'lucide-react';
import { cn } from '../../utils/cn';

const emojis = [
  '💳', '💵', '💶', '💷', '💴', '🏦', '💰', '🧾', '🛒', '🛍️', '🏠', '🏡', '🏢', '🚗', '✈️', '🚀', '⛵', '🎁', '🎉', '🍔', '🍕', '🍟', '💻', '📱', '⌚', '💡', '🔧', '🔨', '📈', '📉', '💼', '👔', '🎓', '💊', '🏥', '⛽', '⚡', '🌍', '🌞', '🌚', '⭐', '🔥', '💧', '💨', '🌊',
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
];

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (style: { symbol: string; type: 'icon' | 'emoji' }) => void;
  title: string;
  initialSymbol?: string;
  initialType?: 'icon' | 'emoji';
  defaultIcon?: string;
}

const AppearanceModal: React.FC<AppearanceModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title, 
  initialSymbol, 
  initialType,
  defaultIcon = 'User'
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(defaultIcon);
  const [symbolType, setSymbolType] = useState<'icon' | 'emoji'>('icon');
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [emojiSearchTerm, setEmojiSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedSymbol(initialSymbol || defaultIcon);
      setSymbolType(initialType || 'icon');
      setIconSearchTerm('');
      setEmojiSearchTerm('');
    }
  }, [isOpen, initialSymbol, initialType, defaultIcon]);

  const filteredIcons = useMemo(() => {
    const iconOrder = [defaultIcon];
    const otherIcons = Object.keys(SolidIcons)
      .filter(key => key !== 'createLucideIcon' && key !== 'default' && key !== 'Icon' && key !== 'LucideIcon' && key !== 'icons')
      .filter(key => {
        const item = (SolidIcons as any)[key];
        return (
          typeof item === 'object' && 
          item !== null && 
          (item as any).displayName === key
        );
      })
      .filter(iconName => !iconOrder.includes(iconName));
    let sortedIcons = [...iconOrder, ...otherIcons];
    if (iconSearchTerm) {
      sortedIcons = sortedIcons.filter(iconName =>
        iconName.toLowerCase().includes(iconSearchTerm.toLowerCase())
      );
    }
    return sortedIcons;
  }, [iconSearchTerm, defaultIcon]);

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchTerm) return emojis;
    return emojis.filter(emoji =>
      emoji.includes(emojiSearchTerm)
    );
  }, [emojiSearchTerm]);

  const handleSave = () => {
    onSave({ symbol: selectedSymbol, type: symbolType });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onEnter={handleSave}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave}>Save Style</Button></>}
      size="lg"
      // Not a database transaction, just local state update usually
      isDatabaseTransaction={false}
    >
      <div className="space-y-4">
        <div className="flex border-b border-border">
          <button onClick={() => { setSymbolType('icon'); setSelectedSymbol(defaultIcon); }} className={cn("px-4 py-2 text-sm font-medium", symbolType === 'icon' ? 'border-b-2 border-accent text-accent' : 'text-font-2 hover:text-font-1')}>Icons</button>
          <button onClick={() => { setSymbolType('emoji'); setSelectedSymbol(emojis[0]); }} className={cn("px-4 py-2 text-sm font-medium", symbolType === 'emoji' ? 'border-b-2 border-accent text-accent' : 'text-font-2 hover:text-font-1')}>Emojis</button>
        </div>
        {symbolType === 'icon' && (
          <>
            <Input placeholder="Search icons..." value={iconSearchTerm} onChange={(e) => setIconSearchTerm(e.target.value)} />
            <div className="h-56 overflow-y-auto grid grid-cols-8 gap-2 p-2 bg-field-disabled rounded-lg">
              {filteredIcons.map(iconName => {
                const Icon = (SolidIcons as any)[iconName];
                if (!Icon) return null;
                return (
                  <button 
                    key={iconName} 
                    onClick={() => setSelectedSymbol(iconName)} 
                    className={cn(
                      "flex items-center justify-center aspect-square rounded-lg transition-colors", // Added aspect-square
                      selectedSymbol === iconName ? 'bg-accent text-white' : 'hover:bg-field-hover text-font-1'
                    )} 
                    title={iconName}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                );
              })}
            </div>
          </>
        )}
        {symbolType === 'emoji' && (
          <>
            <Input placeholder="Search emojis..." value={emojiSearchTerm} onChange={(e) => setEmojiSearchTerm(e.target.value)} />
            <div className="h-56 overflow-y-auto grid grid-cols-8 gap-2 p-2 bg-field-disabled rounded-lg">
              {filteredEmojis.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => setSelectedSymbol(emoji)} 
                  className={cn(
                    "flex items-center justify-center aspect-square rounded-lg transition-colors text-2xl", // Added aspect-square
                    selectedSymbol === emoji ? 'bg-accent' : 'hover:bg-field-hover'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AppearanceModal;
