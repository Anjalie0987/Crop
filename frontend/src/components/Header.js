import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const menuItems = [
        { name: 'Home', href: '/' },
        { name: 'About SNSI', href: '#' },
        { name: 'How It Works', href: '#' },
        { name: 'Map View', href: '#' },
    ];

    return (
        <header className="bg-green-700 text-white shadow-md">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo Section */}
                    <div className="flex items-center">
                        <Link to="/" className="text-xl font-bold tracking-wide hover:text-green-100 transition-colors">
                            SNSI – Soil Nutrient Suitability Index
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex space-x-8 items-center">
                        {menuItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="text-sm font-medium hover:text-green-200 transition-colors duration-200"
                            >
                                {item.name}
                            </a>
                        ))}
                        {/* Login Button */}
                        <Link
                            to="/login"
                            className="bg-white text-green-700 hover:bg-green-50 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all duration-200 transform hover:scale-105"
                        >
                            Login
                        </Link>
                    </nav>

                    {/* Mobile Hamburger Button */}
                    <button
                        className="md:hidden focus:outline-none"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <nav className="md:hidden mt-4 pb-4">
                        <ul className="flex flex-col space-y-3">
                            {menuItems.map((item) => (
                                <li key={item.name}>
                                    <a
                                        href={item.href}
                                        className="block text-sm font-medium hover:text-green-200 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {item.name}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <Link
                                    to="/login"
                                    className="block text-sm font-bold text-green-200 hover:text-white transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
