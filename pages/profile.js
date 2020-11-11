import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import PropTypes from 'prop-types';

import Scream from '../components/favs/Fav';
import Profile from '../components/profile/Profile';
import ScreamSkeleton from '../util/ScreamSkeleton';

import { connect } from 'react-redux';
import { getScreams } from '../redux/actions/dataActions';
/* jshint ignore:start */
class home extends Component {
  componentDidMount() {
    this.props.getScreams();
  }
  render() {
    const { favs, loading } = this.props.data;
    let recentFavsMarkup = !loading ? (
      screams.map((scream) => <Scream key={fav.favId} fav={scream} />)
    ) : (
      <ScreamSkeleton />
    );
    return (
      <Grid container spacing={16}>
        <Grid item sm={8} xs={12}>
          {recentScreamsMarkup}
        </Grid>
        <Grid item sm={6} xs={12}>
          <Profile />
        </Grid>
      </Grid>
    );
  }
}

home.propTypes = {
  getFavs: PropTypes.func.isRequired,
  data: PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
  data: state.data
});

export default connect(
  mapStateToProps,
  { getFavs }
)(home);
