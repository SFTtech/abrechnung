import React from 'react';
import Layout from '../components/style/Layout';


export default function Home() {
    return (
        <>
            <Layout title="Home">
                <main
                    className="mt-10 mx-auto max-w-screen-xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                    <div className="sm:text-center lg:text-left">
                        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                            Built with React and TailwindCSS. Uses JWT and Localstorage for authentication. Also,
                            implements Shared State, thanks to <a href="https://recoiljs.org"
                                                                  className="text-indigo-600">Recoil by Facebook</a>.
                        </p>
                    </div>
                </main>
            </Layout>
        </>
    )
}