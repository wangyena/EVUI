import { getCurrentInstance, nextTick } from 'vue';
import { numberWithComma } from '@/common/utils';

export const commonFunctions = () => {
  const { props } = getCurrentInstance();
  /**
   * 해당 컬럼이 사용자 지정 컬럼인지 확인한다.
   *
   * @param {object} column - 컬럼 정보
   * @returns {boolean} 사용자 지정 컬럼 유무
   */
  const isRenderer = (column = {}) => !!column?.render?.use;
  const getComponentName = (type = '') => {
    const setUpperCaseFirstStr = str => str.charAt(0).toUpperCase() + str.slice(1);
    const rendererStr = 'Renderer';
    let typeStr = '';
    if (type.indexOf('_') !== -1) {
      const typeStrArray = type.split('_');
      for (let ix = 0; ix < typeStrArray.length; ix++) {
        typeStr += setUpperCaseFirstStr(typeStrArray[ix]);
      }
    } else {
      typeStr = setUpperCaseFirstStr(type);
    }
    return typeStr + rendererStr;
  };
  /**
   * 데이터 타입에 따라 변환된 데이터을 반환한다.
   *
   * @param {string} type - 데이터 유형
   * @param {number|string} value - 데이터
   * @returns {number|string} 변환된 데이터
   */
  const getConvertValue = (type, value) => {
    let convertValue = value;

    if (type === 'number') {
      convertValue = numberWithComma(value);
      convertValue = convertValue === false ? value : convertValue;
    } else if (type === 'float') {
      convertValue = value.toFixed(3);
    }

    return convertValue;
  };
  /**
   * 전달받은 필드명과 일치하는 컬럼 인덱스를 반환한다.
   *
   * @param {string} field - 컬럼 필드명
   * @returns {number} 일치한다면 컬럼 인덱스, 일치하지 않는다면 -1
   */
  const getColumnIndex = field => props.columns.findIndex(column => column.field === field);
  const setPixelUnit = (value) => {
    let size = value;
    const hasPx = size.toString().indexOf('px') >= 0;
    const hasPct = size.toString().indexOf('%') >= 0;
    if (!hasPx && !hasPct) {
      size = `${size}px`;
    }
    return size;
  };
  return { isRenderer, getComponentName, getConvertValue, getColumnIndex, setPixelUnit };
};

export const scrollEvent = (params) => {
  const { scrollInfo, stores, elementInfo, resizeInfo } = params;
  /**
   * 수직 스크롤의 위치 계산 후 적용한다.
   */
  const updateVScroll = () => {
    const store = stores.showTreeStore;
    const bodyEl = elementInfo.body;
    const rowHeight = resizeInfo.rowHeight;
    const rowCount = bodyEl.clientHeight > rowHeight
      ? Math.ceil(bodyEl.clientHeight / rowHeight) : store.length;
    const totalScrollHeight = store.length * rowHeight;
    let firstVisibleIndex = Math.floor(bodyEl.scrollTop / rowHeight);
    if (firstVisibleIndex > store.length - 1) {
      firstVisibleIndex = 0;
    }

    const lastVisibleIndex = firstVisibleIndex + rowCount;
    const firstIndex = Math.max(firstVisibleIndex, 0);
    const lastIndex = lastVisibleIndex;

    stores.viewStore = store.slice(firstIndex, lastIndex);
    scrollInfo.hasVerticalScrollBar = rowCount < store.length;
    scrollInfo.vScrollTopHeight = firstIndex * rowHeight;
    scrollInfo.vScrollBottomHeight = totalScrollHeight - (stores.viewStore.length * rowHeight)
      - scrollInfo.vScrollTopHeight;
  };
  /**
   * 수평 스크롤의 위치 계산 후 적용한다.
   */
  const updateHScroll = () => {
    const headerEl = elementInfo.header;
    const bodyEl = elementInfo.body;

    headerEl.scrollLeft = bodyEl.scrollLeft;
  };
  /**
   * scroll 이벤트를 처리한다.
   */
  const onScroll = () => {
    const bodyEl = elementInfo.body;
    const scrollTop = bodyEl.scrollTop;
    const scrollLeft = bodyEl.scrollLeft;
    const lastTop = scrollInfo.lastScroll.top;
    const lastLeft = scrollInfo.lastScroll.left;
    const isHorizontal = !(scrollLeft === lastLeft);
    const isVertical = !(scrollTop === lastTop);

    if (isVertical) {
      updateVScroll();
    }

    if (isHorizontal) {
      updateHScroll();
    }

    scrollInfo.lastScroll.top = scrollTop;
    scrollInfo.lastScroll.left = scrollLeft;
  };
  return { updateVScroll, updateHScroll, onScroll };
};

export const resizeEvent = (params) => {
  const { props } = getCurrentInstance();
  const { resizeInfo, elementInfo, checkInfo, stores, isRenderer, updateVScroll } = params;
  /**
   * 해당 컬럼 인덱스가 마지막인지 확인한다.
   *
   * @param {number} index - 컬럼 인덱스
   * @returns {boolean} 마지막 컬럼 유무
   */
  const isLastColumn = (index) => {
    const columns = stores.orderedColumns;
    let lastIndex = -1;

    for (let ix = columns.length - 1; ix >= 0; ix--) {
      if (!columns[ix].hide) {
        lastIndex = ix;
        break;
      }
    }

    return lastIndex === index;
  };
  /**
   * 고정 너비, 스크롤 유무 등에 따른 컬럼 너비를 계산한다.
   */
  const calculatedColumn = () => {
    stores.viewStore = stores.showTreeStore;
    const store = stores.viewStore;
    let columnWidth = resizeInfo.columnWidth;
    if (resizeInfo.columnWidth > 0) {
      columnWidth = resizeInfo.columnWidth;
    }
    columnWidth = resizeInfo.columnWidth;
    let remainWidth = 0;
    if (resizeInfo.adjust) {
      const bodyEl = elementInfo.body;
      let elWidth = bodyEl.offsetWidth;
      const elHeight = bodyEl.offsetHeight;
      const result = stores.orderedColumns.reduce((acc, column) => {
        if (column.hide) {
          return acc;
        }

        if (column.width) {
          acc.totalWidth += column.width;
        } else {
          acc.emptyCount++;
        }

        return acc;
      }, { totalWidth: 0, emptyCount: 0 });

      if (resizeInfo.rowHeight * store.length > elHeight - resizeInfo.scrollWidth) {
        elWidth -= resizeInfo.scrollWidth;
      }

      if (checkInfo.useCheckbox.use) {
        elWidth -= resizeInfo.minWidth;
      }

      columnWidth = elWidth - result.totalWidth;
      if (columnWidth > 0) {
        remainWidth = columnWidth
          - (Math.floor(columnWidth / result.emptyCount) * result.emptyCount);
        columnWidth = Math.floor(columnWidth / result.emptyCount);
      } else {
        columnWidth = resizeInfo.columnWidth;
      }

      columnWidth = columnWidth < resizeInfo.minWidth ? resizeInfo.minWidth : columnWidth;
      resizeInfo.columnWidth = columnWidth;
    }

    stores.orderedColumns.map((column) => {
      const item = column;
      const minWidth = isRenderer(column) ? resizeInfo.rendererMinWidth : resizeInfo.minWidth;
      if (item.width && item.width < minWidth) {
        item.width = minWidth;
      }
      if (!item.width && !item.hide) {
        item.width = columnWidth;
      }
      return item;
    });

    if (remainWidth) {
      let index = stores.orderedColumns.length - 1;
      let lastColumn = stores.orderedColumns[index];
      while (lastColumn.hide) {
        index -= 1;
        lastColumn = stores.orderedColumns[index];
      }
      lastColumn.width += remainWidth;
    }
    resizeInfo.isResize = !resizeInfo.isResize;
  };
  /**
   * grid resize 이벤트를 처리한다.
   */
  const onResize = async () => {
    await nextTick();
    if (resizeInfo.adjust) {
      stores.orderedColumns.map((column) => {
        const item = column;

        if (!props.columns[column.index].width && !item.resized) {
          item.width = 0;
        }

        return item;
      }, this);
    }

    calculatedColumn();
    updateVScroll();
  };
  const onShow = (isVisible) => {
    if (isVisible) {
      onResize();
    }
  };
  /**
   * column resize 이벤트를 처리한다.
   *
   * @param {number} columnIndex - 컬럼 인덱스
   * @param {object} event - 이벤트 객체
   */
  const onColumnResize = (columnIndex, event) => {
    if (!isLastColumn(columnIndex)) {
      let nextColumnIndex = columnIndex + 1;
      const headerEl = elementInfo.header;
      const headerLeft = headerEl.getBoundingClientRect().left;
      const columnEl = headerEl.querySelector(`li[data-index="${columnIndex}"]`);
      while (stores.orderedColumns[nextColumnIndex].hide) {
        nextColumnIndex++;
      }
      const minWidth = isRenderer(stores.orderedColumns[columnIndex])
        ? resizeInfo.rendererMinWidth : resizeInfo.minWidth;
      const nextMinWidth = isRenderer(stores.orderedColumns[nextColumnIndex])
        ? resizeInfo.rendererMinWidth : resizeInfo.minWidth;
      const nextColumnEl = headerEl.querySelector(`li[data-index="${nextColumnIndex}"]`);
      const columnRect = columnEl.getBoundingClientRect();
      const maxRight = nextColumnEl.getBoundingClientRect().right - headerLeft - nextMinWidth;
      const resizeLineEl = elementInfo.resizeLine;
      const minLeft = columnRect.left - headerLeft + minWidth;
      const startLeft = columnRect.right - headerLeft;
      const startMouseLeft = event.clientX;
      const startColumnLeft = columnRect.left - headerLeft;

      resizeLineEl.style.left = `${startLeft}px`;

      resizeInfo.showResizeLine = true;

      const handleMouseMove = (evt) => {
        const deltaLeft = evt.clientX - startMouseLeft;
        const proxyLeft = startLeft + deltaLeft;
        let resizeWidth = Math.max(minLeft, proxyLeft);

        resizeWidth = Math.min(maxRight, resizeWidth);

        resizeLineEl.style.left = `${resizeWidth}px`;
      };

      const handleMouseUp = () => {
        const destLeft = parseInt(resizeLineEl.style.left, 10);
        const changedWidth = destLeft - startColumnLeft;

        if (stores.orderedColumns[columnIndex]) {
          const columnWidth = stores.orderedColumns[columnIndex].width;
          stores.orderedColumns[columnIndex].width = changedWidth;
          stores.orderedColumns[columnIndex].resized = true;
          stores.orderedColumns[nextColumnIndex].width += (columnWidth - changedWidth);
          stores.orderedColumns[nextColumnIndex].resized = true;
        }

        resizeInfo.showResizeLine = false;
        document.removeEventListener('mousemove', handleMouseMove);
        onResize();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
  };
  return { calculatedColumn, onResize, onShow, onColumnResize };
};

export const clickEvent = (params) => {
  const { emit } = getCurrentInstance();
  const selectInfo = params;
  const getClickedRowData = (event, row) => {
    const tagName = event.target.tagName.toLowerCase();
    let cellInfo = {};
    if (tagName === 'td') {
      cellInfo = event.target.dataset;
    } else {
      cellInfo = event.target.parentNode.dataset;
    }
    return {
      event,
      rowData: row,
      rowIndex: row.index,
      cellName: cellInfo.name,
      cellIndex: cellInfo.index,
    };
  };
  /**
   * row click 이벤트를 처리한다.
   *
   * @param {object} event - 이벤트 객체
   * @param {array} row - row 데이터
   */
  const onRowClick = (event, row) => {
    if (event.target && event.target.parentElement
      && event.target.parentElement.classList.contains('row-checkbox-input')) {
      return false;
    }
    if (selectInfo.useSelect) {
      selectInfo.selectedRow = row;
      emit('update:selected', row);
      emit('click-row', getClickedRowData(event, row));
    }
    return true;
  };
  /**
   * row dblclick 이벤트를 처리한다.
   *
   * @param {object} event - 이벤트 객체
   * @param {array} row - row 데이터
   */
  const onRowDblClick = (event, row) => {
    selectInfo.selectedRow = row;
    emit('update:selected', row);
    emit('dblclick-row', getClickedRowData(event, row));
  };
  return { onRowClick, onRowDblClick };
};

export const checkEvent = (params) => {
  const { checkInfo, stores } = params;
  const { emit } = getCurrentInstance();
  /**
   * row에 대한 체크 상태를 해제한다.
   *
   * @param {array} row - row 데이터
   */
  const unCheckedRow = (row) => {
    const index = stores.treeStore.findIndex(
      item => item.index === row.index);

    if (index !== -1) {
      stores.treeStore[index].checked = row.checked;
    }
  };
  const onCheckChildren = (node) => {
    if (node.hasChild) {
      node.children.forEach((children) => {
        const childNode = children;
        if (node.checked && !childNode.checked) {
          checkInfo.checkedRows.push(childNode);
        }
        if (!node.checked) {
          checkInfo.checkedRows = checkInfo.checkedRows.filter(it => it.index !== childNode.index);
        }
        childNode.checked = node.checked;

        if (childNode.hasChild) {
          onCheckChildren(childNode);
        }
      });
    }
  };
  const onCheckParent = (node) => {
    const parentNode = node.parent;
    if (parentNode) {
      const isCheck = parentNode.children.every(n => n.checked);
      parentNode.checked = isCheck;
      if (!parentNode.checked) {
        checkInfo.checkedRows = checkInfo.checkedRows.filter(it => it.index !== parentNode.index);
      } else {
        checkInfo.checkedRows.push(parentNode);
      }
      if (parentNode.parent) {
        onCheckParent(parentNode);
      }
    }
  };
  /**
   * checkbox click 이벤트를 처리한다.
   *
   * @param {object} event - 이벤트 객체
   * @param {array} rowData - row 데이터
   */
  const onCheck = (event, rowData) => {
    const isSingleMode = () => checkInfo.useCheckbox.mode === 'single';
    const checkedHeader = (store) => {
      if (checkInfo.checkedRows.length === store.length) {
        checkInfo.isHeaderChecked = true;
      }
    };
    const unCheckedHeader = () => {
      if (checkInfo.isHeaderChecked) {
        checkInfo.isHeaderChecked = false;
      }
    };
    const onSingleMode = () => {
      if (isSingleMode() && checkInfo.checkedRows.length > 0) {
        checkInfo.prevCheckedRow.checked = false;
        unCheckedRow(checkInfo.prevCheckedRow);
      }
    };
    const addCheckedRow = (row) => {
      if (isSingleMode()) {
        checkInfo.checkedRows = [row];
        return;
      }
      onCheckChildren(row);
      onCheckParent(row);
      checkInfo.checkedRows.push(row);
    };
    const removeCheckedRow = (row) => {
      if (isSingleMode()) {
        checkInfo.checkedRows = [];
        return;
      }
      checkInfo.checkedRows = checkInfo.checkedRows.filter(it => it.index !== row.index);
    };

    onSingleMode();
    if (rowData.checked) {
      addCheckedRow(rowData);
      checkedHeader(stores.treeStore);
    } else {
      unCheckedHeader();
      removeCheckedRow(rowData);
      onCheckChildren(rowData);
      onCheckParent(rowData);
    }
    checkInfo.prevCheckedRow = rowData;
    emit('update:checked', checkInfo.checkedRows);
    emit('check-row', event, rowData.index, rowData);
  };
  /**
   * all checkbox click 이벤트를 처리한다.
   *
   * @param {object} event - 이벤트 객체
   */
  const onCheckAll = (event) => {
    const store = stores.treeStore;
    const status = checkInfo.isHeaderChecked;
    const checked = [];
    let item;
    for (let ix = 0; ix < store.length; ix++) {
      item = store[ix];
      if (status) {
        checked.push(item);
      }
      item.checked = status;
    }
    checkInfo.checkedRows = checked;
    emit('update:checked', checked);
    emit('check-all', event, checked);
  };
  return { onCheck, onCheckAll };
};

export const contextMenuEvent = (params) => {
  const { emit } = getCurrentInstance();
  const { contextInfo, stores, selectInfo } = params;
  /**
   * 컨텍스트 메뉴를 설정한다.
   *
   * @param {boolean} useCustom - 사용자 지정 메뉴 사용 유무
   */
  const setContextMenu = (useCustom = true) => {
    const menuItems = [];

    if (useCustom && contextInfo.customContextMenu.length) {
      const row = selectInfo.selectedRow;
      const customItems = contextInfo.customContextMenu.map(
        (item) => {
          const menuItem = item;
          if (menuItem.validate) {
            menuItem.disabled = !menuItem.validate(menuItem.itemId, row);
          }

          return menuItem;
        });

      menuItems.push(...customItems);
    }
    contextInfo.contextMenuItems = menuItems;
  };
  /**
   * 마우스 우클릭 이벤트를 처리한다.
   *
   * @param {object} event - 이벤트 객체
   */
  const onContextMenu = (event) => {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    let rowIndex;

    if (tagName === 'td') {
      rowIndex = target.parentElement.dataset.index;
    } else {
      rowIndex = target.parentElement.parentElement.dataset.index;
    }

    if (rowIndex) {
      const index = stores.viewStore.findIndex(v => v.index === Number(rowIndex));
      const rowData = stores.viewStore[index];
      selectInfo.selectedRow = rowData;
      setContextMenu();
      emit('update:selected', rowData);
    } else {
      selectInfo.selectedRow = [];
      setContextMenu(false);
      emit('update:selected', []);
    }
  };
  return { setContextMenu, onContextMenu };
};

export const treeEvent = (params) => {
  const { stores, onResize } = params;
  const setTreeNodeStore = () => {
    let nodeIndex = 0;
    const nodeList = [];

    function getDataObj(nodeObj) {
      const newObj = {};
      Object.keys(nodeObj).forEach((key) => {
        if (key !== 'children') {
          newObj[key] = nodeObj[key];
        }
      });
      return newObj;
    }

    function setNodeData(nodeInfo) {
      const { node, level, isShow, parent } = nodeInfo;
      if (node !== null && typeof node === 'object') {
        node.index = nodeIndex++;
        node.level = level;

        if (!Object.hasOwnProperty.call(node, 'checked')) {
          node.checked = false;
        }

        if (!Object.hasOwnProperty.call(node, 'show')) {
          node.show = isShow;
        }

        if (!Object.hasOwnProperty.call(node, 'expand')) {
          node.expand = true;
        }

        if (!Object.hasOwnProperty.call(node, 'isFilter')) {
          node.isFilter = false;
        }

        if (!Object.hasOwnProperty.call(node, 'data')) {
          node.data = getDataObj(node);
        }

        nodeList.push(node);

        if (typeof parent !== 'undefined') {
          node.parent = parent;
        }
        if (node.children) {
          node.hasChild = true;
          node.children.forEach(child =>
            setNodeData({
              node: child,
              level: level + 1,
              isShow: node.show && node.expand,
              parent: node,
            }),
          );
        }
      }
    }
    setNodeData({
      node: stores.treeRows[0],
      level: 0,
      isShow: true,
      parent: undefined,
    });
    return nodeList;
  };
  const setExpandNode = (children, isShow, isFilter) => {
    children.forEach((nodeObj) => {
      const node = nodeObj;
      node.show = isFilter && isShow ? node.isFilter : isShow;
      if (node.hasChild) {
        setExpandNode(node.children, node.show && node.expand, node.isFilter);
      }
    });
  };
  const handleExpand = (node) => {
    const data = node;
    data.expand = !data.expand;
    setExpandNode(data.children, data.expand, data.isFilter);
    onResize();
  };
  return { setTreeNodeStore, handleExpand };
};

export const filterEvent = (params) => {
  const { stores, getConvertValue, calculatedColumn, updateVScroll } = params;
  const makeParentShow = (data) => {
    if (!data?.parent) {
      return;
    }
    const { parent } = data;
    parent.show = true;
    parent.expand = true;
    parent.isFilter = true;
    makeParentShow(parent);
  };
  let timer = null;
  const onSearch = (searchWord) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      stores.treeStore.forEach((row) => {
        row.show = false;
        row.isFilter = false;
      });
      if (searchWord) {
        const filterStores = stores.treeStore.filter((row) => {
          let isSameWord = false;
          for (let ix = 0; ix < stores.orderedColumns.length; ix++) {
            const column = stores.orderedColumns[ix] || {};
            let columnValue = row[column.field];
            let columnType = column.type;
            if (columnValue) {
              if (!columnType) {
                columnType = 'string';
              }
              columnValue = getConvertValue(columnType, columnValue).toString();
              isSameWord = columnValue.toLowerCase()
                .includes(searchWord.toString().toLowerCase());
              if (isSameWord) {
                break;
              }
            }
          }
          return isSameWord;
        });
        filterStores.forEach((row) => {
          row.show = true;
          row.isFilter = true;
          makeParentShow(row);
        });
      } else {
        stores.treeStore.forEach((row) => {
          row.show = true;
          row.isFilter = false;
        });
      }
      calculatedColumn();
      updateVScroll();
    }, 500);
  };
  return { onSearch };
};
