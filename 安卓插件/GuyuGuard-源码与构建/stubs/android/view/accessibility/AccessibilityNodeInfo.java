package android.view.accessibility;

import android.graphics.Rect;
import android.os.Bundle;

public class AccessibilityNodeInfo {
    public static final int ACTION_CLICK = 16;
    public static final int ACTION_SCROLL_FORWARD = 4096;
    public static final int ACTION_SCROLL_BACKWARD = 8192;
    public static final int ACTION_SET_TEXT = 2097152;
    public static final String ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE = "android.view.accessibility.action.ARGUMENT_SET_TEXT_CHARSEQUENCE";

    public int getChildCount(){return 0;}
    public AccessibilityNodeInfo getChild(int i){return null;}
    public AccessibilityNodeInfo getParent(){return null;}
    public CharSequence getText(){return null;}
    public CharSequence getContentDescription(){return null;}
    public String getViewIdResourceName(){return null;}
    public CharSequence getClassName(){return null;}
    public boolean isClickable(){return false;}
    public boolean isEditable(){return false;}
    public boolean isEnabled(){return false;}
    public boolean isScrollable(){return false;}
    public boolean isPassword(){return false;}
    public boolean isVisibleToUser(){return false;}
    public CharSequence getPackageName(){return null;}
    public void getBoundsInScreen(Rect outBounds){}
    public boolean performAction(int action){return false;}
    public boolean performAction(int action, Bundle arguments){return false;}
    public void recycle(){}
}
