import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const menuItems = [
        { name: 'Home', href: '/' },
        { name: 'About', href: '#' },
        { name: 'Services', href: '#' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Contact', href: '#' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-brand-dark text-white shadow-lg h-[70px] flex items-center font-sans">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-full">
                    {/* Logo Section */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex space-x-8 items-center">
                        {menuItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="text-sm font-medium hover:text-brand-accent transition-colors duration-200"
                            >
                                {item.name}
                            </a>
                        ))}
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
                    <nav className="md:hidden absolute top-[70px] left-0 right-0 bg-brand-dark border-t border-white/10 pb-6 px-6 shadow-xl">
                        <ul className="flex flex-col space-y-4 mt-4">
                            {menuItems.map((item) => (
                                <li key={item.name}>
                                    <a
                                        href={item.href}
                                        className="block text-base font-medium hover:text-brand-accent transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {item.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
