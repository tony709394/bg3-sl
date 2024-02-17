<script setup lang="ts">
import { ref, reactive, Ref } from 'vue'
import { ElMessage } from 'element-plus'
import DialogPerference from './components/Dialog/Perference.vue'
import { Archive, HotkeyDetail } from '../dts/main'
import { Hotkey, MTR, RTM } from '../dts/Enum'

const currentID = ref('')
const path = ref('')
const dialogVisible = ref(false)
const archives: Ref<Archive[]> = ref([])
const hotkey = reactive({
  [Hotkey.Save]: '',
  [Hotkey.Display]: '',
})
const detail = reactive({
  id: '',
  screenshot: '',
})

window.ipcRenderer.on('mtr', (_event, args) => {
  switch (args.type) {
    case MTR.Log:
      console.log(args.data)
      break
    case MTR.Info:
      ElMessage({
        message: args.data,
        type: 'success',
      })
      break
    case MTR.Error:
      ElMessage({
        message: args.data,
        type: 'error',
      })
      break
    case MTR.Preference:
      dialogVisible.value = true
      break
    case MTR.Hotkey:
      hotkey[Hotkey.Save] = args.data[Hotkey.Save]
      hotkey[Hotkey.Display] = args.data[Hotkey.Display]
      break
    case MTR.Path:
      path.value = args.data
      break
    case MTR.UpdateArchive:
      archives.value = args.data
      break
    case MTR.LoadArchive:
      ElMessage({
        message: args.data,
        type: 'success',
      })
      break
    case MTR.DeleteArchive:
      detail.id = ''
      detail.screenshot = ''
      ElMessage({
        message: args.data,
        type: 'success',
      })
      break
  }
})

const selectArchive = (archive: Archive) => {
  detail.id = archive.id
  detail.screenshot = archive.screenshot
  currentID.value = archive.id
}

const loadArchive = (id: string) => {
  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.LoadArchive,
        data: id
      }
  )
}

const deleteArchive = (id: string) => {
  window.ipcRenderer.send(
      'rtm',
      {
        type: RTM.DeleteArchive,
        data: id
      }
  )
}

const changeHotkey = (payload: HotkeyDetail) => {
  hotkey[payload.type] = payload.accelerator
}
</script>

<template>
  <template v-if="archives.length > 0">
    <div id="block-top">
      <div id="block-left">
        <div v-for="(archive, index) in archives" :key="index">
          <div
              class="item-archive text"
              :class="{ 'text-selected': archive.id === currentID }"
              @click="selectArchive(archive)">{{ archive.id }}</div>
        </div>
      </div>
      <div id="block-right">
        <template v-if="detail.id">
          <div>
            <div class="text">{{ detail.id }}</div>
            <el-image class="screenshot" :src="detail.screenshot" />
          </div>
          <div class="block-bottom">
            <el-button type="primary" @click="deleteArchive(detail.id)">delete</el-button>
          </div>
        </template>
      </div>
    </div>

    <div class="block-bottom">
      <el-button :disabled="!detail.id" type="primary" @click="loadArchive(detail.id)">load</el-button>
    </div>
  </template>

  <div id="block-empty" v-else>
    <el-empty :image-size="200" />
  </div>

  <dialog-perference
    v-model="dialogVisible"
    :path="path"
    :hotkey="hotkey"
    @changeHotkey="changeHotkey"/>
</template>

<style scoped>
  .item-archive {
    cursor: pointer;
  }

  .screenshot {
  }

  #block-left {
    width: 400px;
    height: 100%;
    overflow-y: scroll;
    font-size: 16px;
    background: #888888;
  }

  #block-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    background: #aaa;
  }

  .text {
    font-size: 16px;
    white-space: nowrap;
  }

  .text-selected {
    font-weight: bold;
  }

  #block-top {
    display: flex;
    height: calc(100% - 80px);
    font-size: 0;
  }

  .block-bottom {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80px;
    background: #ccc;
  }

  #block-empty {
    height: 100%;
    display: flex;
    justify-content: center;
  }
</style>
