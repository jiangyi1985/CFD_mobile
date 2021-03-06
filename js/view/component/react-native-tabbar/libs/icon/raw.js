import React, { Component } from 'react';
import { View } from 'react-native';
import Wrapper from './../wrapper'
import PropTypes from 'prop-types';

const extendRawIcon = (ChildComponent) => {
  class RawIcon extends Component {
    constructor(props, context) {
      super(props, context);
    }

    registerIcon() {

    }

    componentDidMount() {
      const { tabName, registerTabIcon } = this.context;
      if (registerTabIcon) {
        registerTabIcon({
          active: () => {
            const ref = this.refs['wrap'].getWrappedRef();
            if (ref.tabDidActive) {
              ref.tabDidActive();
            }
          },
          inactive: () => {
            const ref = this.refs['wrap'].getWrappedRef();
            if (ref.tabDidInactive) {
              ref.tabDidInactive();
            }
          }
        }, tabName);
      }
    }

    setActiveColor(color){
      this.refs['wrap'].refs['child'].setActiveColor(color)
    }

    setLabel(value){
      this.refs['wrap'].refs['child'].setLabel(value)
    }

    setEnable(value){
      this.refs['wrap'].refs['child'].setEnable(value)
    }

    render() {
      const component = ChildComponent? <ChildComponent ref="child" {...this.props}/> : this.props.children;
      const { barSize } = this.context;

      return (
        <View style={{ overflow: 'hidden', flex: 1, height: barSize }}>
          <Wrapper ref="wrap">
            {component}
          </Wrapper>
        </View>
      );
    }
  }

  RawIcon.contextTypes = {
    barSize: PropTypes.number,
    tabName: PropTypes.string,
    registerTabIcon: PropTypes.func
  };

  RawIcon.displayName = "RawIcon";

  return RawIcon;
}

const RawIcon = extendRawIcon()
export { RawIcon, extendRawIcon };
