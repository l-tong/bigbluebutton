import React, { Component } from 'react';
import browser from 'browser-detect';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListTitle from '/imports/ui/components/dropdown/list/title/component';
import DropdownListSeparator from '/imports/ui/components/dropdown/list/separator/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import Icon from '/imports/ui/components/icon/component';
import logger from '/imports/startup/client/logger';
import VideoListItemStats from './video-list-item-stats/component';
import FullscreenButtonContainer from '../../fullscreen-button/container';
import { styles } from '../styles';
import { withDraggableConsumer } from '../../../media/webcam-draggable-overlay/context';

const intlMessages = defineMessages({
  connectionStatsLabel: {
    id: 'app.video.stats.title',
  },
});

class VideoListItem extends Component {
  constructor(props) {
    super(props);
    this.videoTag = null;

    this.state = {
      showStats: false,
      stats: { video: {} },
      videoIsReady: false,
    };

    this.toggleStats = this.toggleStats.bind(this);
    this.setStats = this.setStats.bind(this);
    this.setVideoIsReady = this.setVideoIsReady.bind(this);
  }

  componentDidMount() {
    const { onMount, webcamDraggableDispatch } = this.props;

    webcamDraggableDispatch(
      {
        type: 'setVideoRef',
        value: this.videoTag,
      },
    );

    onMount(this.videoTag);

    this.videoTag.addEventListener('loadeddata', () => this.setVideoIsReady());
  }

  componentDidUpdate() {
    const playElement = (elem) => {
      if (elem.paused) {
        const p = elem.play();
        if (p && (typeof Promise !== 'undefined') && (p instanceof Promise)) {
          // Catch exception when playing video
          p.catch((e) => {
            logger.warn({
              logCode: 'videolistitem_component_play_error',
              extraInfo: { error: e },
            }, 'Could not play video');
          });
        }
      }
    };

    // This is here to prevent the videos from freezing when they're
    // moved around the dom by react, e.g., when  changing the user status
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=382879
    if (this.videoTag) {
      playElement(this.videoTag);
    }
  }

  setStats(updatedStats) {
    const { stats } = this.state;
    const { audio, video } = updatedStats;
    this.setState({ stats: { ...stats, video, audio } });
  }

  setVideoIsReady() {
    const { videoIsReady } = this.state;
    if (!videoIsReady) this.setState({ videoIsReady: true });
    window.dispatchEvent(new Event('resize'));
  }

  getAvailableActions() {
    const {
      intl,
      actions,
      user,
      enableVideoStats,
    } = this.props;

    return _.compact([
      <DropdownListTitle className={styles.hiddenDesktop} key="name">{user.name}</DropdownListTitle>,
      <DropdownListSeparator className={styles.hiddenDesktop} key="sep" />,
      ...actions.map(action => (<DropdownListItem key={user.id} {...action} />)),
      (enableVideoStats
        ? (
          <DropdownListItem
            key={`list-item-stats-${user.id}`}
            onClick={() => { this.toggleStats(); }}
            label={intl.formatMessage(intlMessages.connectionStatsLabel)}
          />
        )
        : null),
    ]);
  }

  toggleStats() {
    const { getStats, stopGettingStats } = this.props;
    const { showStats } = this.state;
    if (showStats) {
      stopGettingStats();
    } else {
      getStats(this.videoTag, this.setStats);
    }
    this.setState({ showStats: !showStats });
  }

  renderFullscreenButton() {
    const { user } = this.props;
    return (
      <FullscreenButtonContainer
        fullscreenRef={this.videoTag}
        elementName={user.name}
      />
    );
  }

  render() {
    const { showStats, stats, videoIsReady } = this.state;
    const {
      user,
      numOfUsers,
      webcamDraggableState,
    } = this.props;
    const availableActions = this.getAvailableActions();
    const enableVideoMenu = Meteor.settings.public.kurento.enableVideoMenu || false;

    const result = browser();
    const isFirefox = (result && result.name) ? result.name.includes('firefox') : false;

    return (
      <div className={cx({
        [styles.content]: true,
        [styles.talking]: user.isTalking,
      })}
      >
        {!videoIsReady && <div className={styles.connecting} />}
        <video
          muted
          className={cx({
            [styles.media]: true,
            [styles.cursorGrab]: !webcamDraggableState.dragging,
            [styles.cursorGrabbing]: webcamDraggableState.dragging,
          })}
          ref={(ref) => { this.videoTag = ref; }}
          autoPlay
          playsInline
        />
        <div className={styles.info}>
          {enableVideoMenu && availableActions.length >= 3
            ? (
              <Dropdown className={isFirefox ? styles.dropdownFireFox
                : styles.dropdown}
              >
                <DropdownTrigger className={styles.dropdownTrigger}>
                  <span>{user.name}</span>
                </DropdownTrigger>
                <DropdownContent placement="top left" className={styles.dropdownContent}>
                  <DropdownList className={styles.dropdownList}>
                    {availableActions}
                  </DropdownList>
                </DropdownContent>
              </Dropdown>
            )
            : (
              <div className={isFirefox ? styles.dropdownFireFox
                : styles.dropdown}
              >
                <span className={cx({
                  [styles.userName]: true,
                  [styles.noMenu]: numOfUsers < 3,
                })}
                >
                  {user.name}
                </span>
              </div>
            )
          }
          {user.isMuted ? <Icon className={styles.muted} iconName="unmute_filled" /> : null}
          {user.isListenOnly ? <Icon className={styles.voice} iconName="listen" /> : null}
        </div>
        {
          showStats
            ? <VideoListItemStats toggleStats={this.toggleStats} stats={stats} />
            : null
        }
        {videoIsReady && this.renderFullscreenButton()}
      </div>
    );
  }
}

export default injectIntl(withDraggableConsumer(VideoListItem));

VideoListItem.defaultProps = {
  numOfUsers: 0,
};

VideoListItem.propTypes = {
  intl: intlShape.isRequired,
  enableVideoStats: PropTypes.bool.isRequired,
  actions: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.objectOf(PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
    PropTypes.object,
    PropTypes.string,
  ])).isRequired,
  numOfUsers: PropTypes.number,
};
