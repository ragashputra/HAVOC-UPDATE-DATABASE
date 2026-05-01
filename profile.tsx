import React, { useState } from 'react';
import { Button, Icon } from 'some-ui-library'; // Assume some-ui-library is the UI framework used

const Profile = () => {
    // State for language preference
    const [language, setLanguage] = useState('ID'); // Default to Indonesian
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const handleLanguageChange = () => {
        setLanguage(prev => (prev === 'ID' ? 'EN' : 'ID'));
    };

    const checkForUpdates = () => {
        // Logic for checking updates goes here. For now, we will simulate it.
        setUpdateAvailable(true); // Simulate that an update is available
    };

    return (
        <div>
            <header>
                <h1>Profile Page</h1>
                <p>&copy; 2026 Your Company</p>
            </header>
            <div>
                <h2>Language Selection</h2>
                <Button onClick={handleLanguageChange}>
                    <Icon name={language === 'ID' ? 'indonesia-flag' : 'english-flag'} />
                    {language === 'ID' ? 'Switch to English' : 'Beralih ke Bahasa Indonesia'}
                </Button>
            </div>
            <div>
                <h2>Check for Updates</h2>
                <Button onClick={checkForUpdates}>
                    <Icon name="update" />
                    {updateAvailable ? 'Update Available' : 'Check Update'} / {updateAvailable ? 'Pembaruan Tersedia' : 'Lihat Pembaharuan'}
                </Button>
            </div>
        </div>
    );
};

export default Profile;