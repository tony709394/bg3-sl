<script setup lang="ts">
import { ref, PropType } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { RTM, Hotkey } from '../../../dts/Enum'

interface Hotkeys {
  hotkey_save: string
  hotkey_display: string
}

const props = defineProps({
  path: String,
  hotkey: Object as PropType<Hotkeys>
})
const emits = defineEmits([ 'update:modelValue', 'changeHotkey' ])

const path = ref('')

const handleClose = () => {
  emits('update:modelValue', false)
}

const selectPath = () => {
  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.Dialog,
        data: {}
      }
  )
}

const enableHotkey = () => {
  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.EnableHotkey,
        data: true
      }
  )
}

const disableHotkey = () => {
  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.EnableHotkey,
        data: false
      }
  )
}

const inputHotkey = (event: any, type: Hotkey) => {
  const data = {
    type,
    accelerator: event.key,
  }
  emits('changeHotkey', data)

  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.Hotkey,
        data
      }
  )
}
</script>

<template>
  <el-dialog
      title="Preference"
      @close="handleClose"
  >
    <div>path:</div>
    <el-input
        v-model="props.path"
        placeholder="Please select path"
        :readonly="true"
     >
      <template #append>
        <el-button type="primary" :icon="Search" @click="selectPath" />
      </template>
    </el-input>
    <div>hotkey save:</div>
    <el-input
        v-if="props.hotkey"
        v-model="props.hotkey[Hotkey.Save]"
        :readonly="true"
        @focus="disableHotkey"
        @blur="enableHotkey"
        @keydown.prevent="inputHotkey($event, Hotkey.Save)"></el-input>
    <div>hotkey display:</div>
    <el-input
        v-if="props.hotkey"
        v-model="props.hotkey[Hotkey.Display]"
        :readonly="true"
        @focus="disableHotkey"
        @blur="enableHotkey"
        @keydown.prevent="inputHotkey($event, Hotkey.Display)"></el-input>
  </el-dialog>
</template>

<style scoped>
</style>
