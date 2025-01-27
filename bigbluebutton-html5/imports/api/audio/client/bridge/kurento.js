import BaseAudioBridge from './base';
import Auth from '/imports/ui/services/auth';
import { fetchWebRTCMappedStunTurnServers } from '/imports/utils/fetchStunTurnServers';
import logger from '/imports/startup/client/logger';

const SFU_URL = Meteor.settings.public.kurento.wsUrl;
const MEDIA = Meteor.settings.public.media;
const MEDIA_TAG = MEDIA.mediaTag.replace(/#/g, '');
const GLOBAL_AUDIO_PREFIX = 'GLOBAL_AUDIO_';

export default class KurentoAudioBridge extends BaseAudioBridge {
  constructor(userData) {
    super();
    const {
      userId,
      username,
      voiceBridge,
      meetingId,
      sessionToken,
    } = userData;

    this.user = {
      userId,
      name: username,
      sessionToken,
    };

    this.media = {
      inputDevice: {},
    };


    this.internalMeetingID = meetingId;
    this.voiceBridge = voiceBridge;
  }

  joinAudio({ isListenOnly, inputStream }, callback) {
    return new Promise(async (resolve, reject) => {
      this.callback = callback;
      let iceServers = [];

      try {
        iceServers = await fetchWebRTCMappedStunTurnServers(this.user.sessionToken);
      } catch (error) {
        logger.error({ logCode: 'sfuaudiobridge_stunturn_fetch_failed' },
          'SFU audio bridge failed to fetch STUN/TURN info, using default servers');
      } finally {
        logger.debug({ logCode: 'sfuaudiobridge_stunturn_fetch_sucess', extraInfo: { iceServers } },
          "SFU audio bridge got STUN/TURN servers");
        const options = {
          wsUrl: Auth.authenticateURL(SFU_URL),
          userName: this.user.name,
          caleeName: `${GLOBAL_AUDIO_PREFIX}${this.voiceBridge}`,
          iceServers,
          logger,
          inputStream,
        };

        const onSuccess = () => {
          const { webRtcPeer } = window.kurentoManager.kurentoAudio;
          if (webRtcPeer) {
            const audioTag = document.getElementById(MEDIA_TAG);
            const stream = webRtcPeer.getRemoteStream();
            audioTag.pause();
            audioTag.srcObject = stream;
            audioTag.muted = false;
            audioTag.play();
          }
          resolve(this.callback({ status: this.baseCallStates.started }));
        };

        const onFail = (error) => {
          let reason = 'Undefined';
          if (error) {
            reason = error.reason || error.id || error;
          }
          this.callback({
            status: this.baseCallStates.failed,
            error: this.baseErrorCodes.CONNECTION_ERROR,
            bridgeError: reason,
          });

          reject(reason);
        };

        if (!isListenOnly) {
          return reject('Invalid bridge option');
        }

        window.kurentoJoinAudio(
          MEDIA_TAG,
          this.voiceBridge,
          this.user.userId,
          this.internalMeetingID,
          onFail,
          onSuccess,
          options,
        );
      }
    });
  }

  async changeOutputDevice(value) {
    const audioContext = document.querySelector(`#${MEDIA_TAG}`);
    if (audioContext.setSinkId) {
      try {
        await audioContext.setSinkId(value);
        this.media.outputDeviceId = value;
      } catch (error) {
        logger.error({logCode: 'sfuaudiobridge_changeoutputdevice_error', extraInfo: { error }},
          'SFU audio bridge failed to fetch STUN/TURN info, using default');
        throw new Error(this.baseErrorCodes.MEDIA_ERROR);
      }
    }

    return this.media.outputDeviceId || value;
  }


  exitAudio() {
    return new Promise((resolve) => {
      window.kurentoExitAudio();
      return resolve(this.callback({ status: this.baseCallStates.ended }));
    });
  }
}
