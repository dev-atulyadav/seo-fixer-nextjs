import React from "react";

const Navbar = () => {
    return (
        <nav>
            <ul className="flex justify-center items-center gap-3">
                <li>Home</li>
                <li>Dashboard</li>
                <li>Login</li>
                <li>Register</li>
                <li>About</li>
                <li>Contact</li>
            </ul>
        </nav>
    );
};

export default Navbar;
