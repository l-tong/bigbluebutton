import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import browser from 'browser-detect';
import injectWbResizeEvent from '/imports/ui/components/presentation/resize-wrapper/component';
import Button from '/imports/ui/components/button/component';
import { HUNDRED_PERCENT, MAX_PERCENT, STEP } from '/imports/utils/slideCalcUtils';
import cx from 'classnames';
import { styles } from './styles.scss';
import ZoomTool from './zoom-tool/component';
import FullscreenButtonContainer from '../../video-provider/fullscreen-button/container';
import Tooltip from '/imports/ui/components/tooltip/component';
import KEY_CODES from '/imports/utils/keyCodes';

const intlMessages = defineMessages({
  previousSlideLabel: {
    id: 'app.presentation.presentationToolbar.prevSlideLabel',
    description: 'Previous slide button label',
  },
  previousSlideDesc: {
    id: 'app.presentation.presentationToolbar.prevSlideDesc',
    description: 'Aria description for when switching to previous slide',
  },
  nextSlideLabel: {
    id: 'app.presentation.presentationToolbar.nextSlideLabel',
    description: 'Next slide button label',
  },
  nextSlideDesc: {
    id: 'app.presentation.presentationToolbar.nextSlideDesc',
    description: 'Aria description for when switching to next slide',
  },
  noNextSlideDesc: {
    id: 'app.presentation.presentationToolbar.noNextSlideDesc',
    description: '',
  },
  noPrevSlideDesc: {
    id: 'app.presentation.presentationToolbar.noPrevSlideDesc',
    description: '',
  },
  skipSlideLabel: {
    id: 'app.presentation.presentationToolbar.skipSlideLabel',
    description: 'Aria label for when switching to a specific slide',
  },
  skipSlideDesc: {
    id: 'app.presentation.presentationToolbar.skipSlideDesc',
    description: 'Aria description for when switching to a specific slide',
  },
  goToSlide: {
    id: 'app.presentation.presentationToolbar.goToSlide',
    description: 'button for slide select',
  },
  selectLabel: {
    id: 'app.presentation.presentationToolbar.selectLabel',
    description: 'slide select label',
  },
  fitToWidth: {
    id: 'app.presentation.presentationToolbar.fitToWidth',
    description: 'button for fit to width',
  },
  fitToWidthDesc: {
    id: 'app.presentation.presentationToolbar.fitWidthDesc',
    description: 'Aria description to display the whole width of the slide',
  },
  fitToPage: {
    id: 'app.presentation.presentationToolbar.fitToPage',
    description: 'button label for fit to width',
  },
  fitToPageDesc: {
    id: 'app.presentation.presentationToolbar.fitScreenDesc',
    description: 'Aria description to display the whole slide',
  },
  presentationLabel: {
    id: 'app.presentationUploder.title',
    description: 'presentation area element label',
  },
});

class PresentationToolbar extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      sliderValue: 100,
    };
    this.handleValuesChange = this.handleValuesChange.bind(this);
    this.handleSkipToSlideChange = this.handleSkipToSlideChange.bind(this);
    this.change = this.change.bind(this);
    this.renderAriaDescs = this.renderAriaDescs.bind(this);
    this.switchSlide = this.switchSlide.bind(this);
    this.setInt = 0;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.switchSlide);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.switchSlide);
  }

  switchSlide(event) {
    const { target, which } = event;
    const isBody = target.nodeName === 'BODY';
    const { actions } = this.props;

    if (isBody) {
      if ([KEY_CODES.ARROW_LEFT].includes(which)) {
        actions.previousSlideHandler();
      }
      if ([KEY_CODES.ARROW_RIGHT].includes(which)) {
        actions.nextSlideHandler();
      }
    }
  }

  handleSkipToSlideChange(event) {
    const { actions } = this.props;
    const requestedSlideNum = Number.parseInt(event.target.value, 10);
    actions.skipToSlideHandler(requestedSlideNum);
  }

  handleValuesChange(event) {
    const { sliderValue } = this.state;
    this.setState(
      { sliderValue: event.target.value },
      () => this.handleZoom(sliderValue),
    );
  }

  change(value) {
    const { zoomChanger } = this.props;
    zoomChanger(value);
  }

  renderAriaDescs() {
    const { intl } = this.props;
    return (
      <div hidden>
        {/* Aria description's for toolbar buttons */}
        <div id="prevSlideDesc">
          {intl.formatMessage(intlMessages.previousSlideDesc)}
        </div>
        <div id="noPrevSlideDesc">
          {intl.formatMessage(intlMessages.noPrevSlideDesc)}
        </div>
        <div id="nextSlideDesc">
          {intl.formatMessage(intlMessages.nextSlideDesc)}
        </div>
        <div id="noNextSlideDesc">
          {intl.formatMessage(intlMessages.noNextSlideDesc)}
        </div>
        <div id="skipSlideDesc">
          {intl.formatMessage(intlMessages.skipSlideDesc)}
        </div>
        <div id="fitWidthDesc">
          {intl.formatMessage(intlMessages.fitToWidthDesc)}
        </div>
        <div id="fitPageDesc">
          {intl.formatMessage(intlMessages.fitToPageDesc)}
        </div>
      </div>
    );
  }

  renderSkipSlideOpts(numberOfSlides) {
    // Fill drop down menu with all the slides in presentation
    const { intl } = this.props;
    const optionList = [];
    for (let i = 1; i <= numberOfSlides; i += 1) {
      optionList.push((
        <option
          value={i}
          key={i}
        >
          {
            intl.formatMessage(intlMessages.goToSlide, { 0: i })
          }
        </option>));
    }

    return optionList;
  }

  render() {
    const {
      currentSlideNum,
      numberOfSlides,
      fitToWidthHandler,
      fitToWidth,
      actions,
      intl,
      zoom,
      isFullscreen,
      fullscreenRef,
      isMeteorConnected,
    } = this.props;

    const BROWSER_RESULTS = browser();
    const isMobileBrowser = BROWSER_RESULTS.mobile
      || BROWSER_RESULTS.os.includes('Android');

    const tooltipDistance = 35;

    const startOfSlides = !(currentSlideNum > 1);
    const endOfSlides = !(currentSlideNum < numberOfSlides);

    const prevSlideAriaLabel = startOfSlides
      ? intl.formatMessage(intlMessages.previousSlideLabel)
      : `${intl.formatMessage(intlMessages.previousSlideLabel)} (${currentSlideNum <= 1 ? '' : (currentSlideNum - 1)})`;

    const nextSlideAriaLabel = endOfSlides
      ? intl.formatMessage(intlMessages.nextSlideLabel)
      : `${intl.formatMessage(intlMessages.nextSlideLabel)} (${currentSlideNum >= 1 ? (currentSlideNum + 1) : ''})`;

    return (
      <div id="presentationToolbarWrapper" className={styles.presentationToolbarWrapper}>
        {this.renderAriaDescs()}
        {<div />}
        {
          <div className={styles.presentationSlideControls}>
            <Button
              role="button"
              aria-label={prevSlideAriaLabel}
              aria-describedby={startOfSlides ? 'noPrevSlideDesc' : 'prevSlideDesc'}
              disabled={startOfSlides || !isMeteorConnected}
              color="default"
              icon="left_arrow"
              size="md"
              onClick={actions.previousSlideHandler}
              label={intl.formatMessage(intlMessages.previousSlideLabel)}
              hideLabel
              className={cx(styles.prevSlide, styles.presentationBtn)}
              tooltipDistance={tooltipDistance}
            />

            <Tooltip
              tooltipDistance={tooltipDistance}
              title={intl.formatMessage(intlMessages.selectLabel)}
              className={styles.presentationBtn}
            >
              <select
                id="skipSlide"
                aria-label={intl.formatMessage(intlMessages.skipSlideLabel)}
                aria-describedby="skipSlideDesc"
                aria-live="polite"
                aria-relevant="all"
                disabled={!isMeteorConnected}
                value={currentSlideNum}
                onChange={this.handleSkipToSlideChange}
                className={styles.skipSlideSelect}
              >
                {this.renderSkipSlideOpts(numberOfSlides)}
              </select>
            </Tooltip>
            <Button
              role="button"
              aria-label={nextSlideAriaLabel}
              aria-describedby={endOfSlides ? 'noNextSlideDesc' : 'nextSlideDesc'}
              disabled={endOfSlides || !isMeteorConnected }
              color="default"
              icon="right_arrow"
              size="md"
              onClick={actions.nextSlideHandler}
              label={intl.formatMessage(intlMessages.nextSlideLabel)}
              hideLabel
              className={cx(styles.skipSlide, styles.presentationBtn)}
              tooltipDistance={tooltipDistance}
            />
          </div>
        }
        {
          <div className={styles.presentationZoomControls}>
            {
              !isMobileBrowser
                ? (
                  <ZoomTool
                    zoomValue={zoom}
                    change={this.change}
                    minBound={HUNDRED_PERCENT}
                    maxBound={MAX_PERCENT}
                    step={STEP}
                    tooltipDistance={tooltipDistance}
                    isMeteorConnected={isMeteorConnected}
                  />
                )
                : null
            }
            <Button
              role="button"
              aria-describedby={fitToWidth ? 'fitPageDesc' : 'fitWidthDesc'}
              aria-label={fitToWidth
                ? `${intl.formatMessage(intlMessages.presentationLabel)} ${intl.formatMessage(intlMessages.fitToPage)}`
                : `${intl.formatMessage(intlMessages.presentationLabel)} ${intl.formatMessage(intlMessages.fitToWidth)}`
              }
              color="default"
              disabled={!isMeteorConnected}
              icon="fit_to_width"
              size="md"
              circle={false}
              onClick={fitToWidthHandler}
              label={fitToWidth
                ? intl.formatMessage(intlMessages.fitToPage)
                : intl.formatMessage(intlMessages.fitToWidth)
              }
              hideLabel
              className={cx(styles.fitToWidth, styles.presentationBtn)}
              tooltipDistance={tooltipDistance}
            />
            {
              !isFullscreen
              && (
                <FullscreenButtonContainer
                  fullscreenRef={fullscreenRef}
                  elementName={intl.formatMessage(intlMessages.presentationLabel)}
                  tooltipDistance={tooltipDistance}
                  dark
                  className={styles.presentationBtn}
                />
              )
            }
          </div>
        }
      </div>
    );
  }
}

PresentationToolbar.propTypes = {
  // Number of current slide being displayed
  currentSlideNum: PropTypes.number.isRequired,
  // Total number of slides in this presentation
  numberOfSlides: PropTypes.number.isRequired,
  // Actions required for the presenter toolbar
  actions: PropTypes.shape({
    nextSlideHandler: PropTypes.func.isRequired,
    previousSlideHandler: PropTypes.func.isRequired,
    skipToSlideHandler: PropTypes.func.isRequired,
  }).isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  zoomChanger: PropTypes.func.isRequired,
  fitToWidthHandler: PropTypes.func.isRequired,
  fitToWidth: PropTypes.bool.isRequired,
  fullscreenRef: PropTypes.instanceOf(Element),
  isFullscreen: PropTypes.bool.isRequired,
  zoom: PropTypes.number.isRequired,
  isMeteorConnected: PropTypes.bool.isRequired,
};

PresentationToolbar.defaultProps = {
  fullscreenRef: null,
};


export default injectWbResizeEvent(injectIntl(PresentationToolbar));
