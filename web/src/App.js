import React, {Component} from 'react';
import {Counter} from './features/counter/Counter';
import './App.css';

class App extends Component {
    componentWillMount() {

    }

    render() {
        return (
            <div className="App">
                <header className="App-header">
                    <Counter/>
                    <p>
                        Edit <code>src/App.js</code> and save to reload.
                    </p>
                </header>
            </div>
        );
    }
}

export default App;
