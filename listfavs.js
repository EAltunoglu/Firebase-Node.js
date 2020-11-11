import React from 'react';

import axios from 'axios';
//import Axios from 'axios';

const BASE_URL = 'https://us-central1-favfay-ec70a.cloudfunctions.net/api';
// jshint ignore:start
export default class FavList extends React.Component{
    state = {
        favs: []
    }

    componentDidMount(){
        axios.get(`https://us-central1-favfay-ec70a.cloudfunctions.net/api/favs`)
            .then(res => {
                const favs = res.data;
                this.setState({persons});
            })
    }

    render(){
        return(
            <ul>
                {this.state.favs.map(fav => <li>{fav.name}</li>)}
            </ul>
        )
    }
}