import React from 'react';

import API from './functions/handlers/favs';
// jshint ignore:start
class App extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            isLoading: true,
            name: null, 
            avatar: null,
            email: null
        };
    }

    render(){
        const {isLoading, name, avatar, email } = this.state;

        return(
          <User isLoading={isLoading} name={name} avatar={avatar} email={email}/>
        );
    }

    async componentDidMount(){

    }
}