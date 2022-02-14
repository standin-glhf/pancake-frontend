import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import Split from 'split-grid'
import { Button, ChartIcon, Flex } from '@pancakeswap/uikit'
import debounce from 'lodash/debounce'
import delay from 'lodash/delay'
import { useAppDispatch } from 'state'
import {
  useChartView,
  useGetPredictionsStatus,
  useIsChartPaneOpen,
  useIsHistoryPaneOpen,
} from 'state/predictions/hooks'
import { setChartPaneState, setChartView } from 'state/predictions'
import { PredictionsChartView, PredictionStatus } from 'state/types'
import { useTranslation } from 'contexts/Localization'
import { ChartByLabel } from 'components/Chart/ChartbyLabel'
import { TabToggle } from 'components/TabToggle'
import TradingView from './components/TradingView'
import { ErrorNotification, PauseNotification } from './components/Notification'
import History from './History'
import Positions from './Positions'
import { ChainLinkChart } from './components/ChainlinkChart'

// The value to set the chart when the user clicks the chart tab at the bottom
const GRID_TEMPLATE_ROW = '1.2fr 24px .8fr'

const ExpandButtonGroup = styled(Flex)`
  bottom: 24px;
  left: 32px;
  position: absolute;
  display: none;
  background-color: ${({ theme }) => theme.colors.input};
  border-radius: 24px 24px 0 0;
  z-index: 50;
  ${({ theme }) => theme.mediaQueries.lg} {
    display: inline-flex;
  }
`

const SplitWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr 24px 0;
  flex: 1;
  overflow: hidden;
`

const ChartPane = styled.div`
  overflow: hidden;
  position: relative;
  background: ${({ theme }) => theme.colors.background};
`

const HistoryPane = styled.div<{ isHistoryPaneOpen: boolean }>`
  flex: none;
  overflow: hidden;
  transition: width 200ms ease-in-out;
  width: ${({ isHistoryPaneOpen }) => (isHistoryPaneOpen ? '384px' : 0)};
`

const StyledDesktop = styled.div`
  display: none;

  ${({ theme }) => theme.mediaQueries.lg} {
    display: flex;
    height: calc(100vh - 100px);
  }
`

const PositionPane = styled.div`
  align-items: center;
  display: flex;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  & > div {
    flex: 1;
    overflow: hidden;
  }
`

const Gutter = styled.div`
  background: ${({ theme }) => theme.card.background};
  cursor: row-resize;
  height: 24px;
  position: relative;

  &:before {
    background-color: ${({ theme }) => theme.colors.textSubtle};
    border-radius: 8px;
    content: '';
    height: 4px;
    left: 50%;
    margin-left: -32px;
    position: absolute;
    top: 10px;
    width: 64px;
  }
`

const Desktop: React.FC = () => {
  const splitWrapperRef = useRef<HTMLDivElement>()
  const chartRef = useRef<HTMLDivElement>()
  const gutterRef = useRef<HTMLDivElement>()
  const isHistoryPaneOpen = useIsHistoryPaneOpen()
  const isChartPaneOpen = useIsChartPaneOpen()
  const chartView = useChartView()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const status = useGetPredictionsStatus()

  const toggleChartPane = () => {
    const newChartPaneState = !isChartPaneOpen

    if (newChartPaneState) {
      splitWrapperRef.current.style.transition = 'grid-template-rows 150ms'
      splitWrapperRef.current.style.gridTemplateRows = GRID_TEMPLATE_ROW

      // Purely comedic: We only want to animate if we are clicking the open chart button
      // If we keep the transition on the resizing becomes very choppy
      delay(() => {
        splitWrapperRef.current.style.transition = ''
      }, 150)
    }

    dispatch(setChartPaneState(newChartPaneState))
  }

  useEffect(() => {
    const threshold = 100
    const handleDrag = debounce(() => {
      const { height } = chartRef.current.getBoundingClientRect()

      // If the height of the chart pane goes below the "snapOffset" threshold mark the chart pane as closed
      dispatch(setChartPaneState(height > threshold))
    }, 50)

    const split = Split({
      dragInterval: 1,
      snapOffset: threshold,
      onDrag: handleDrag,
      rowGutters: [
        {
          track: 1,
          element: gutterRef.current,
        },
      ],
    })

    return () => {
      split.destroy()
    }
  }, [gutterRef, chartRef, dispatch])

  return (
    <>
      <StyledDesktop>
        <SplitWrapper ref={splitWrapperRef}>
          <PositionPane>
            {status === PredictionStatus.ERROR && <ErrorNotification />}
            {status === PredictionStatus.PAUSED && <PauseNotification />}
            {status === PredictionStatus.LIVE && <Positions />}
          </PositionPane>

          <Gutter ref={gutterRef}>
            <ExpandButtonGroup>
              <TabToggle
                height="42px"
                as={Button}
                style={{ whiteSpace: 'nowrap', alignItems: 'center' }}
                isActive={chartView === PredictionsChartView.TradingView}
                onMouseDown={(e) => {
                  toggleChartPane()
                  dispatch(setChartView(PredictionsChartView.TradingView))
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {chartView === PredictionsChartView.TradingView && <ChartIcon mr="10px" />} TradingView {t('Chart')}
              </TabToggle>
              <TabToggle
                as={Button}
                height="42px"
                style={{ whiteSpace: 'nowrap', alignItems: 'center' }}
                isActive={chartView === PredictionsChartView.Chainlink}
                onMouseDown={(e) => {
                  toggleChartPane()
                  dispatch(setChartView(PredictionsChartView.Chainlink))
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {chartView === PredictionsChartView.Chainlink && <ChartIcon mr="10px" />} Chainlink {t('Chart')}
              </TabToggle>
            </ExpandButtonGroup>
            <ChartByLabel
              justifyContent="flex-end"
              symbol="BNBUSDT"
              by={chartView}
              link={
                chartView === PredictionsChartView.TradingView ? `https://www.tradingview.com/symbols/BNBUSDT` : ''
                // TODO: Add link to chainlink chart
              }
            />
          </Gutter>
          <ChartPane ref={chartRef}>
            {chartView === PredictionsChartView.TradingView ? <TradingView /> : <ChainLinkChart />}
          </ChartPane>
        </SplitWrapper>
        <HistoryPane isHistoryPaneOpen={isHistoryPaneOpen}>
          <History />
        </HistoryPane>
      </StyledDesktop>
    </>
  )
}

export default Desktop
