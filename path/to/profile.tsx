import React, { useState } from 'react';

const Profile = () => {
    const [language, setLanguage] = useState('ID');

    const toggleLanguage = () => {
        setLanguage(prevLanguage => (prevLanguage === 'ID' ? 'EN' : 'ID'));
    };

    return (
        <div>
            <h1>{language === 'ID' ? 'Profil' : 'Profile'}</h1>
            <button onClick={toggleLanguage}>
                {language === 'ID' ? 'Ubah ke EN' : 'Switch to ID'}
            </button>
            <footer>
                <p>&copy; 2026</p>
            </footer>
        </div>
    );
};

export default Profile;