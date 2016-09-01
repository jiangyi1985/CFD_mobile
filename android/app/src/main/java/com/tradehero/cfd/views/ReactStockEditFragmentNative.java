package com.tradehero.cfd.views;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.SystemClock;
import android.util.AttributeSet;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.mobeta.android.dslv.DragSortListView;
import com.tradehero.cfd.R;
import com.tradehero.cfd.RNManager;
import com.tradehero.cfd.RNNativeModules.NativeDataModule;
import com.tradehero.cfd.module.LogicData;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * @author <a href="mailto:sam@tradehero.mobi"> Sam Yu </a>
 */
public class ReactStockEditFragmentNative extends RelativeLayout {

    private Context mContext;
    EventDispatcher mEventDispatcher;

    public ReactStockEditFragmentNative(Context context) {

        this(context, null);
    }

    public ReactStockEditFragmentNative(Context context, AttributeSet attrs) {
        super(context, attrs);

        this.mContext = context;
        LayoutInflater.from(context).inflate(R.layout.stock_edit_native_content, this, true);
    }

    public void refresh() {
        adapter.notifyDataSetChanged();
        action(100);
    }

    public void setEventDispatcher(EventDispatcher eventDispatcher) {
        this.mEventDispatcher = eventDispatcher;
    }

    protected void action(int id) {
        mEventDispatcher.dispatchEvent(
                new NativeRefreshEvent(getId(), SystemClock.uptimeMillis(), id));
    }


    private DragSortListView list;
    private TextView selectAll;
    private TextView deleteSelected;
    private boolean selectAllPicked = false;
    private StockListAdapter adapter;
    private List<StockInfo> stockInfo;
    private JSONArray myListArray;

    public void initView() {
        list = (DragSortListView) findViewById(R.id.stockList);
        selectAll = (TextView) findViewById(R.id.selectAll);
        deleteSelected = (TextView) findViewById(R.id.deleteSelected);

        myListArray = LogicData.getInstance().getMyList();
        stockInfo = generateStockInfoList(myListArray);
        adapter = new StockListAdapter(mContext, R.layout.list_item_checkable, stockInfo);
        list.setAdapter(adapter);

        list.setDropListener(onDrop);

        selectAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (selectAllPicked) {
                    selectAllPicked = false;
                    adapter.markAllUnchecked();
                    selectAll.setText(R.string.select_all);
                } else {
                    adapter.markAllChecked();
                    selectAllPicked = true;
                    selectAll.setText(R.string.cancel);
                }

            }
        });

        deleteSelected.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AlertDialog.Builder alertDialogBuilder = new AlertDialog.Builder(mContext);
                alertDialogBuilder
                        .setTitle(R.string.dialog_title)
                        .setMessage(R.string.remove_hint_message)
                        .setCancelable(true)
                        .setNegativeButton(R.string.cancel, new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                dialog.dismiss();
                            }
                        })
                        .setPositiveButton(R.string.confirm, new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                dialog.dismiss();
                                adapter.deleteChecked();
                                updateDeleteButton();
                            }
                        });

                AlertDialog alertDialog = alertDialogBuilder.create();
                alertDialog.show();
                alertDialog.setCanceledOnTouchOutside(true);
            }
        });



    }


    private DragSortListView.DropListener onDrop =
            new DragSortListView.DropListener() {
                @Override
                public void drop(int from, int to) {
                    if (from != to) {
                        StockInfo item = adapter.remove(from);
                        adapter.insert(item, to);
                        list.moveCheckState(from, to);
                    }
                }
            };


    public List<StockInfo> generateStockInfoList(JSONArray myList) {
        List<StockInfo> result = new ArrayList<>();

        try {
            for (int i = 0; i < myList.length(); i++) {
                JSONObject oneItem = myList.getJSONObject(i);

                StockInfo info = new StockInfo(oneItem.getString("name"), oneItem.getString("symbol"),oneItem.getInt("id"));
                result.add(info);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return result;
    }

    private void updateDeleteButton() {
        int checkNumber = adapter.getCheckedNum();
        if (checkNumber > 0) {
            deleteSelected.setEnabled(true);
            deleteSelected.setText(getResources().getText(R.string.delete) + "(" + checkNumber + ")");
        } else {
            deleteSelected.setEnabled(false);
            deleteSelected.setText(getResources().getText(R.string.delete));
        }
    }

    private void updateSelectAllButton() {
        if (selectAllPicked && adapter.getCheckedNum() == 0) {
            selectAllPicked = false;
            selectAll.setText(R.string.select_all);
        }
    }


    class StockInfo {
        boolean mChecked;
        String mName;
        String mSymbol;
        int mId;

        public StockInfo(String name, String symbol,int id) {
            mName = name;
            mSymbol = symbol;
            mId = id;
            mChecked = false;
        }
    }

    class StockListAdapter extends BaseAdapter {

        private LayoutInflater mInflater;
        private int mResource;
        private List<StockInfo> mStockInfo;

        public StockListAdapter(Context context, int resource, List<StockInfo> stockInfo) {
            super();
            mInflater = LayoutInflater.from(context);
            mResource = resource;
            mStockInfo = stockInfo;
        }

        @Override
        public int getCount() {
            return mStockInfo.size();
        }

        @Override
        public StockInfo getItem(int position) {
            return mStockInfo.get(position);
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public View getView(final int position, View convertView, ViewGroup parent) {
            View view = mInflater.inflate(mResource, parent, false);

            CheckBox checkBox = (CheckBox) view.findViewById(R.id.checkbox);
            TextView name = (TextView) view.findViewById(R.id.name);
            TextView symbol = (TextView) view.findViewById(R.id.symbol);
            ViewGroup pushToTop = (ViewGroup) view.findViewById(R.id.pushToTop);
            ViewGroup notificationSwitch = (ViewGroup) view.findViewById(R.id.notificationSwitch);

            checkBox.setChecked(mStockInfo.get(position).mChecked);
            name.setText(mStockInfo.get(position).mName);
            symbol.setText(mStockInfo.get(position).mSymbol);

            checkBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                    mStockInfo.get(position).mChecked = isChecked;
                    updateDeleteButton();
                    updateSelectAllButton();
                }
            });

            pushToTop.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    StockInfo info = remove(position);
                    insert(info, 0);
                    Toast.makeText(mContext, R.string.pushed_to_top, Toast.LENGTH_SHORT).show();
                }
            });

            notificationSwitch.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //TODO
                    setAlert(mStockInfo.get(position));
                }
            });

            return view;
        }

        public StockInfo remove(int index) {
            return mStockInfo.remove(index);
        }

        public void setAlert(StockInfo item) {
            mEventDispatcher.dispatchEvent(
                    new TapAlertEvent(getId(), SystemClock.uptimeMillis(), item.mId));
        }

        public void insert(StockInfo item, int to) {
            mStockInfo.add(to, item);
            refresh();
        }

        public int getCheckedNum() {
            int result = 0;
            Iterator<StockInfo> iterator = mStockInfo.iterator();
            while (iterator.hasNext()) {
                if (iterator.next().mChecked) {
                    result++;
                }
            }

            return result;
        }

        public void markAllChecked() {
            Iterator<StockInfo> iterator = mStockInfo.iterator();
            while (iterator.hasNext()) {
                StockInfo info = iterator.next();
                info.mChecked = true;
            }

            updateDeleteButton();
            refresh();
        }

        public void markAllUnchecked() {
            Iterator<StockInfo> iterator = mStockInfo.iterator();
            while (iterator.hasNext()) {
                StockInfo info = iterator.next();
                info.mChecked = false;
            }

            updateDeleteButton();
            refresh();
        }

        public void deleteChecked() {
            for (int i = mStockInfo.size() - 1; i >= 0; i--) {
                if (mStockInfo.get(i).mChecked) {
                    mStockInfo.remove(i);
                }
            }

            refresh();
        }
    }


    public static class NativeRefreshEvent extends Event<NativeRefreshEvent> {

        public static final String EVENT_NAME = "NativeRefreshEvent";

        private final int mValue;

        protected NativeRefreshEvent(int viewTag, long timestampMs, int value) {
            super(viewTag, timestampMs);
            mValue = value;
        }

        @Override
        public String getEventName() {
            return EVENT_NAME;
        }

        @Override
        public void dispatch(RCTEventEmitter rctEventEmitter) {
            rctEventEmitter.receiveEvent(getViewTag(), getEventName(), serializeEventData());
        }

        private WritableMap serializeEventData() {
            WritableMap eventData = Arguments.createMap();
            eventData.putInt("data", mValue);
            return eventData;
        }
    }

    public static class TapAlertEvent extends Event<TapAlertEvent> {

        public static final String EVENT_NAME = "TapAlertEvent";

        private final int mValue;//Stock id is int like 黄金 mValue is 34821

        protected TapAlertEvent(int viewTag, long timestampMs, int value) {
            super(viewTag, timestampMs);
            mValue = value;
        }

        @Override
        public String getEventName() {
            return EVENT_NAME;
        }

        @Override
        public void dispatch(RCTEventEmitter rctEventEmitter) {
            rctEventEmitter.receiveEvent(getViewTag(), getEventName(), serializeEventData());
        }

        private WritableMap serializeEventData() {
            WritableMap eventData = Arguments.createMap();
            eventData.putInt("data", mValue);
            return eventData;
        }
    }


    protected void saveStockData(){
        JSONArray result = new JSONArray();
                try {
                    for (int i = 0; i < adapter.getCount(); i++) {
                        StockInfo info = adapter.getItem(i);

                        for (int j = 0; j < myListArray.length(); j++) {
                            JSONObject stockObject = myListArray.getJSONObject(j);

                            if (stockObject.getString("name").equals(info.mName)) {
                                result.put(stockObject);
                                break;
                            }
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                NativeDataModule.passDataToRN((ReactContext)mContext, LogicData.MY_LIST, result.toString());
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        saveStockData();
    }
}