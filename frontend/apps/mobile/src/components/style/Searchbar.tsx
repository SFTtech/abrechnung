import * as React from "react";
import {
    Animated,
    GestureResponderEvent,
    I18nManager,
    Platform,
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";
import color from "color";
import { ActivityIndicator, IconButton, Surface, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export type Props = React.ComponentPropsWithRef<typeof TextInput> & {
    /**
     * Accessibility label for the button. This is read by the screen reader when the user taps the button.
     */
    clearAccessibilityLabel?: string;
    /**
     * Accessibility label for the button. This is read by the screen reader when the user taps the button.
     */
    searchAccessibilityLabel?: string;
    /**
     * Hint text shown when the input is empty.
     */
    value?: string;
    placeholder?: string;
    /**
     * Callback that is called when the text input's text changes.
     */
    onChangeText?: (query: string) => void;
    /**
     * Callback to execute if we want the left icon to act as button.
     */
    onIconPress?: (e: GestureResponderEvent) => void;
    /**
     * Callback to execute if we want the left icon to act as button.
     */
    onClearIconPress?: (e: GestureResponderEvent) => void;
    /**
     * @supported Available in v5.x with theme version 3
     * Changes Searchbar shadow and background on iOS and Android.
     */
    elevation?: 0 | 1 | 2 | 3 | 4 | 5 | Animated.Value;
    /**
     * Set style of the TextInput component inside the searchbar
     */
    inputStyle?: StyleProp<TextStyle>;
    style?: StyleProp<ViewStyle>;
    /**
     * Custom color for icon, default will be derived from theme
     */
    iconColor?: string;
    /**
     * @supported Available in v5.x
     * Custom flag for replacing clear button with activity indicator.
     */
    loading?: boolean;
    /**
     * TestID used for testing purposes
     */
    testID?: string;
};

type TextInputHandles = Pick<TextInput, "setNativeProps" | "isFocused" | "clear" | "blur" | "focus">;

/**
 * Searchbar is a simple input box where users can type search queries.
 *
 * <div class="screenshots">
 *   <img class="small" src="screenshots/searchbar.png" />
 * </div>
 *
 * ## Usage
 * ```js
 * import * as React from 'react';
 * import { Searchbar } from 'react-native-paper';
 *
 * const MyComponent = () => {
 *   const [searchQuery, setSearchQuery] = React.useState('');
 *
 *   const onChangeSearch = query => setSearchQuery(query);
 *
 *   return (
 *     <Searchbar
 *       placeholder="Search"
 *       onChangeText={onChangeSearch}
 *       value={searchQuery}
 *     />
 *   );
 * };
 *
 * export default MyComponent;

 * ```
 */
const Searchbar = React.forwardRef<TextInputHandles, Props>(
    (
        {
            clearAccessibilityLabel = "clear",
            iconColor: customIconColor,
            inputStyle,
            onIconPress,
            onClearIconPress,
            placeholder,
            searchAccessibilityLabel = "search",
            elevation = 1,
            style,
            value,
            loading = false,
            testID = "search-bar",
            ...rest
        }: Props,
        ref
    ) => {
        const root = React.useRef<TextInput>(null);
        const theme = useTheme();

        React.useImperativeHandle(ref, () => {
            const input = root.current;

            if (input) {
                return {
                    focus: () => input.focus(),
                    clear: () => input.clear(),
                    setNativeProps: (args: TextInputProps) => input.setNativeProps(args),
                    isFocused: () => input.isFocused(),
                    blur: () => input.blur(),
                };
            }

            const noop = () => {
                throw new Error("TextInput is not available");
            };

            return {
                focus: noop,
                clear: noop,
                setNativeProps: noop,
                isFocused: noop,
                blur: noop,
            };
        });

        const handleClearPress = (e: GestureResponderEvent) => {
            root.current?.clear();
            rest.onChangeText?.("");
            if (onClearIconPress) {
                onClearIconPress(e);
            }
        };

        const { colors, roundness, dark, isV3 } = theme;
        const textColor = isV3 ? theme.colors.onSurface : theme.colors.text;
        const iconColor = customIconColor || (dark ? textColor : color(textColor).alpha(0.54).rgb().string());
        const rippleColor = color(textColor).alpha(0.32).rgb().string();

        return (
            <Surface
                style={[{ borderRadius: roundness }, !isV3 && styles.elevation, styles.container, style]}
                {...(theme.isV3 && { elevation })}
            >
                <IconButton
                    accessibilityRole="button"
                    borderless
                    rippleColor={rippleColor}
                    onPress={onIconPress}
                    iconColor={iconColor}
                    icon={({ size, color }) => (
                        <MaterialCommunityIcons
                            name="magnify"
                            color={color}
                            size={size}
                            direction={I18nManager.getConstants().isRTL ? "rtl" : "ltr"}
                        />
                    )}
                    accessibilityLabel={searchAccessibilityLabel}
                />
                <TextInput
                    style={[
                        styles.input,
                        {
                            color: textColor,
                            ...(theme.isV3 ? theme.fonts.default : theme.fonts.regular),
                            ...Platform.select({ web: { outline: "none" } }),
                        },
                        inputStyle,
                    ]}
                    placeholder={placeholder || ""}
                    placeholderTextColor={theme.isV3 ? theme.colors.onSurface : theme.colors?.placeholder}
                    selectionColor={colors?.primary}
                    underlineColorAndroid="transparent"
                    returnKeyType="search"
                    keyboardAppearance={dark ? "dark" : "light"}
                    accessibilityRole="search"
                    ref={root}
                    testID={testID}
                    {...rest}
                />
                {loading ? (
                    <ActivityIndicator testID="activity-indicator" style={styles.loader} />
                ) : (
                    // Clear icon should be always rendered within Searchbar – it's transparent,
                    // without touch events, when there is no value. It's done to avoid issues
                    // with the abruptly stopping ripple effect and changing bar width on web,
                    // when clearing the value.
                    <View
                        pointerEvents={rest.clearButtonMode === "always" ? "auto" : value ? "auto" : "none"}
                        testID={`${testID}-icon-wrapper`}
                    >
                        <IconButton
                            borderless
                            accessibilityLabel={clearAccessibilityLabel}
                            iconColor={
                                rest.clearButtonMode === "always"
                                    ? iconColor
                                    : value
                                      ? iconColor
                                      : "rgba(255, 255, 255, 0)"
                            }
                            rippleColor={rippleColor}
                            onPress={handleClearPress}
                            icon={({ size, color }) => (
                                <MaterialCommunityIcons
                                    name="close"
                                    color={color}
                                    size={size}
                                    direction={I18nManager.getConstants().isRTL ? "rtl" : "ltr"}
                                />
                            )}
                            accessibilityRole="button"
                        />
                    </View>
                )}
            </Surface>
        );
    }
);

Searchbar.displayName = "Searchbar";

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
    },
    input: {
        flex: 1,
        fontSize: 18,
        paddingLeft: 8,
        alignSelf: "stretch",
        textAlign: I18nManager.getConstants().isRTL ? "right" : "left",
        minWidth: 0,
    },
    elevation: {
        elevation: 4,
    },
    loader: {
        margin: 10,
    },
});

export default Searchbar;
