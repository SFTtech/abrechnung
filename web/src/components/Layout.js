import React from 'react'

import Header from "./Header";

export default function Layout({title, children}) {
    return (
        <>
            <Header/>
            <div>
                <div
                    className="container flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </div>
        </>
    )
}