import React, {useState} from 'react';
import {useSettings} from '../../context/SettingsContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

const UserNameSetup: React.FC = () => {
  const [name, setName] = useState('');
  const {settings, updateSettings} = useSettings();

  const handleContinue = () => {
    if (name.trim()) {
      const capitalizedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
      updateSettings({...settings, userName: capitalizedName});
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">What should we call you?</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            This name will be used on generated documents like PDF receipts to identify you.
          </p>
        </div>
        <Input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
        <Button onClick={handleContinue} disabled={!name.trim()} className="w-full">
          Continue
        </Button>
      </Card>
    </div>
  );
};

export default UserNameSetup;
